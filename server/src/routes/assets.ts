import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import type { Config, ImageInfo, ImageAsset, AssignImageRequest, AssignImageResponse, NextImageOrderResponse, PromptAsset, SavePromptRequest, SavePromptResponse, LoadPromptResponse } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { readFileSafe } from '../utils/filesystem.js';
import {
  NAMING_RULES,
  parseImageFilename,
  parsePromptFilename,
  buildImageFilename,
  validateLabel,
  compareImageAssets,
  parseChapterNum,
  parseSequenceNum,
} from '../../../shared/naming.js';

// Supported image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// Calculate MD5 hash of a file for duplicate detection
async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

export function createAssetRoutes(config: Config): Router {
  const router = Router();

  // GET /api/assets/incoming - Scan image source directory for pending images
  router.get('/incoming', async (_req: Request, res: Response) => {
    try {
      const imageSourceDir = expandPath(config.imageSourceDirectory);

      if (!await fs.pathExists(imageSourceDir)) {
        res.json({ images: [], duplicates: [] });
        return;
      }

      const entries = await fs.readdir(imageSourceDir, { withFileTypes: true });
      const imageFiles = entries.filter(e =>
        e.isFile() && IMAGE_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
      );

      // Calculate hashes and build image info
      const hashMap = new Map<string, string>(); // hash -> first file path
      const images: ImageInfo[] = [];
      const duplicates: Array<{ keep: string; duplicate: string }> = [];

      for (const file of imageFiles) {
        const filePath = path.join(imageSourceDir, file.name);
        const stats = await fs.stat(filePath);
        const hash = await calculateFileHash(filePath);

        const imageInfo: ImageInfo = {
          path: filePath,
          filename: file.name,
          size: stats.size,
          timestamp: stats.mtime.toISOString(),
          hash,
        };

        // Check for duplicates
        if (hashMap.has(hash)) {
          imageInfo.isDuplicate = true;
          imageInfo.duplicateOf = hashMap.get(hash);
          duplicates.push({
            keep: hashMap.get(hash)!,
            duplicate: filePath,
          });
        } else {
          hashMap.set(hash, filePath);
        }

        images.push(imageInfo);
      }

      // Sort by timestamp (newest first)
      images.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      res.json({ images, duplicates });
    } catch (error) {
      console.error('Error scanning incoming images:', error);
      res.status(500).json({
        images: [],
        duplicates: [],
        error: error instanceof Error ? error.message : 'Failed to scan incoming images',
      });
    }
  });

  // GET /api/assets/images - List existing images and prompts in project's assets/images/
  // NFR-6: Using projectDirectory with getProjectPaths()
  router.get('/images', async (_req: Request, res: Response) => {
    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      if (!await fs.pathExists(paths.images)) {
        res.json({ images: [], prompts: [] });
        return;
      }

      const imagesDir = paths.images;

      const entries = await fs.readdir(imagesDir, { withFileTypes: true });
      const images: ImageAsset[] = [];
      const prompts: PromptAsset[] = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const filePath = path.join(imagesDir, entry.name);
        const stats = await fs.stat(filePath);

        // Try parsing as image
        const parsedImage = parseImageFilename(entry.name);
        if (parsedImage) {
          images.push({
            ...parsedImage,
            filename: entry.name,
            path: filePath,
            size: stats.size,
            timestamp: stats.mtime.toISOString(),
            type: 'image',
          });
          continue;
        }

        // Try parsing as prompt
        const parsedPrompt = parsePromptFilename(entry.name);
        if (parsedPrompt) {
          // Read full content for Shift+Hover preview, and first ~50 chars for inline display
          const content = (await readFileSafe(filePath)) ?? '';
          let contentPreview = content.slice(0, 50).replace(/\n/g, ' ');
          if (content.length > 50) contentPreview += '...';

          prompts.push({
            ...parsedPrompt,
            filename: entry.name,
            path: filePath,
            size: stats.size,
            timestamp: stats.mtime.toISOString(),
            type: 'prompt',
            content,
            contentPreview,
          });
        }
      }

      // Sort using shared comparator
      images.sort(compareImageAssets);
      prompts.sort(compareImageAssets);

      res.json({ images, prompts });
    } catch (error) {
      console.error('Error listing project images:', error);
      res.status(500).json({
        images: [],
        prompts: [],
        error: error instanceof Error ? error.message : 'Failed to list project images',
      });
    }
  });

  // GET /api/assets/next-image-order - Calculate next available image order
  // FR-22: Also considers prompt files when calculating next order
  // NFR-6: Using projectDirectory with getProjectPaths()
  router.get('/next-image-order', async (req: Request, res: Response) => {
    try {
      const { chapter, sequence } = req.query;

      if (!chapter || !sequence) {
        res.status(400).json({ success: false, error: 'Chapter and sequence are required' });
        return;
      }

      const paths = getProjectPaths(expandPath(config.projectDirectory));

      let existingCount = 0;
      let nextImageOrder = '1';

      if (await fs.pathExists(paths.images)) {
        const entries = await fs.readdir(paths.images);

        // Find all images and prompts matching this chapter-sequence
        for (const filename of entries) {
          // Try parsing as image or prompt
          const parsed = parseImageFilename(filename) || parsePromptFilename(filename);
          if (parsed && parsed.chapter === chapter && parsed.sequence === sequence) {
            existingCount++;
            const order = parseInt(parsed.imageOrder, 10);
            if (order >= parseInt(nextImageOrder, 10)) {
              nextImageOrder = String(order + 1);
            }
          }
        }
      }

      res.json({
        chapter,
        sequence,
        nextImageOrder,
        existingCount,
      } as NextImageOrderResponse);
    } catch (error) {
      console.error('Error calculating next image order:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate next image order',
      });
    }
  });

  // POST /api/assets/assign - Assign (rename and move) an image to the project
  router.post('/assign', async (req: Request, res: Response) => {
    const { sourcePath, chapter, sequence, imageOrder, variant, label }: AssignImageRequest = req.body;

    // Validate inputs
    if (!sourcePath || !chapter || !sequence || !imageOrder || !label) {
      res.status(400).json({
        success: false,
        oldPath: sourcePath || '',
        newPath: '',
        error: 'Missing required fields: sourcePath, chapter, sequence, imageOrder, and label are required',
      } as AssignImageResponse);
      return;
    }

    // Validate chapter (2 digits)
    if (!NAMING_RULES.chapter.pattern.test(chapter)) {
      res.status(400).json({
        success: false,
        oldPath: sourcePath,
        newPath: '',
        error: NAMING_RULES.chapter.errorMessage,
      } as AssignImageResponse);
      return;
    }

    // Validate sequence (1 or more digits)
    if (!NAMING_RULES.sequence.pattern.test(sequence)) {
      res.status(400).json({
        success: false,
        oldPath: sourcePath,
        newPath: '',
        error: NAMING_RULES.sequence.errorMessage,
      } as AssignImageResponse);
      return;
    }

    // Validate imageOrder (1 or more digits)
    if (!NAMING_RULES.imageOrder.pattern.test(imageOrder)) {
      res.status(400).json({
        success: false,
        oldPath: sourcePath,
        newPath: '',
        error: NAMING_RULES.imageOrder.errorMessage,
      } as AssignImageResponse);
      return;
    }

    // Validate variant (single letter or null)
    if (variant !== null && !NAMING_RULES.variant.pattern.test(variant)) {
      res.status(400).json({
        success: false,
        oldPath: sourcePath,
        newPath: '',
        error: NAMING_RULES.variant.errorMessage,
      } as AssignImageResponse);
      return;
    }

    // Validate label
    const labelError = validateLabel(label);
    if (labelError) {
      res.status(400).json({
        success: false,
        oldPath: sourcePath,
        newPath: '',
        error: labelError,
      } as AssignImageResponse);
      return;
    }

    try {
      // Check if source file exists
      if (!await fs.pathExists(sourcePath)) {
        res.status(404).json({
          success: false,
          oldPath: sourcePath,
          newPath: '',
          error: 'Source file not found',
        } as AssignImageResponse);
        return;
      }

      // Build new filename
      // NFR-6: Using projectDirectory with getProjectPaths()
      const extension = path.extname(sourcePath).toLowerCase();
      const newFilename = buildImageFilename(chapter, sequence, imageOrder, variant, label, extension);

      // Determine target directory
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const newPath = path.join(paths.images, newFilename);

      // Check for conflicts
      if (await fs.pathExists(newPath)) {
        res.status(409).json({
          success: false,
          oldPath: sourcePath,
          newPath,
          error: `Target file already exists: ${newFilename}`,
        } as AssignImageResponse);
        return;
      }

      // Ensure images directory exists
      await fs.ensureDir(paths.images);

      // Move and rename file
      await fs.move(sourcePath, newPath);

      console.log(`Assigned image: ${path.basename(sourcePath)} -> ${newFilename}`);

      res.json({
        success: true,
        oldPath: sourcePath,
        newPath,
      } as AssignImageResponse);
    } catch (error) {
      console.error('Error assigning image:', error);
      res.status(500).json({
        success: false,
        oldPath: sourcePath,
        newPath: '',
        error: error instanceof Error ? error.message : 'Failed to assign image',
      } as AssignImageResponse);
    }
  });

  // DELETE /api/assets/incoming/:encodedPath - Remove an incoming image (move to trash)
  router.delete('/incoming/:encodedPath', async (req: Request, res: Response) => {
    const filePath = decodeURIComponent(req.params.encodedPath);

    try {
      if (!await fs.pathExists(filePath)) {
        res.json({ success: true, message: 'File already removed' });
        return;
      }

      // Move to system trash or just delete
      // For simplicity, we'll just delete it (Downloads cleanup)
      await fs.remove(filePath);

      console.log(`Deleted incoming image: ${path.basename(filePath)}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting incoming image:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete image',
      });
    }
  });

  // GET /api/assets/image/:encodedPath - Serve an image file (for thumbnails)
  router.get('/image/:encodedPath', async (req: Request, res: Response) => {
    const filePath = decodeURIComponent(req.params.encodedPath);

    try {
      if (!await fs.pathExists(filePath)) {
        res.status(404).json({ success: false, error: 'Image not found' });
        return;
      }

      // Get the file extension and set content type
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      // Stream the file
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to serve image',
      });
    }
  });

  // FR-22: POST /api/assets/prompt - Create, update, or delete a prompt file
  // FR-38: If content is empty, delete the prompt file (Option A)
  router.post('/prompt', async (req: Request, res: Response) => {
    const { chapter, sequence, imageOrder, variant, label, content }: SavePromptRequest = req.body;

    // Validate inputs (content can be empty for deletion)
    if (!chapter || !sequence || !imageOrder || !label) {
      res.status(400).json({
        success: false,
        path: '',
        filename: '',
        created: false,
        error: 'Missing required fields: chapter, sequence, imageOrder, and label are required',
      } as SavePromptResponse);
      return;
    }

    // Validate chapter (2 digits)
    if (!NAMING_RULES.chapter.pattern.test(chapter)) {
      res.status(400).json({
        success: false,
        path: '',
        filename: '',
        created: false,
        error: NAMING_RULES.chapter.errorMessage,
      } as SavePromptResponse);
      return;
    }

    // Validate sequence
    if (!NAMING_RULES.sequence.pattern.test(sequence)) {
      res.status(400).json({
        success: false,
        path: '',
        filename: '',
        created: false,
        error: NAMING_RULES.sequence.errorMessage,
      } as SavePromptResponse);
      return;
    }

    // Validate imageOrder
    if (!NAMING_RULES.imageOrder.pattern.test(imageOrder)) {
      res.status(400).json({
        success: false,
        path: '',
        filename: '',
        created: false,
        error: NAMING_RULES.imageOrder.errorMessage,
      } as SavePromptResponse);
      return;
    }

    // Validate variant (single letter or null)
    if (variant !== null && !NAMING_RULES.variant.pattern.test(variant)) {
      res.status(400).json({
        success: false,
        path: '',
        filename: '',
        created: false,
        error: NAMING_RULES.variant.errorMessage,
      } as SavePromptResponse);
      return;
    }

    // Validate label
    const labelError = validateLabel(label);
    if (labelError) {
      res.status(400).json({
        success: false,
        path: '',
        filename: '',
        created: false,
        error: labelError,
      } as SavePromptResponse);
      return;
    }

    try {
      // Build filename (same as image but with .txt)
      // NFR-6: Using projectDirectory with getProjectPaths()
      const filename = buildImageFilename(chapter, sequence, imageOrder, variant, label, '.txt');

      // Determine target directory
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const filePath = path.join(paths.images, filename);

      // Check if file exists (for created flag)
      const exists = await fs.pathExists(filePath);

      // FR-38: If content is empty, delete the file (Option A)
      if (!content || !content.trim()) {
        if (exists) {
          await fs.remove(filePath);
          console.log(`Deleted prompt: ${filename}`);
          res.json({
            success: true,
            path: filePath,
            filename,
            created: false,
            deleted: true,  // Extra flag to indicate deletion
          });
        } else {
          // Nothing to delete
          res.json({
            success: true,
            path: filePath,
            filename,
            created: false,
            deleted: false,
          });
        }
        return;
      }

      // Ensure images directory exists
      await fs.ensureDir(paths.images);

      // Write the prompt file
      await fs.writeFile(filePath, content, 'utf-8');

      console.log(`${exists ? 'Updated' : 'Created'} prompt: ${filename}`);

      res.json({
        success: true,
        path: filePath,
        filename,
        created: !exists,
      } as SavePromptResponse);
    } catch (error) {
      console.error('Error saving prompt:', error);
      res.status(500).json({
        success: false,
        path: '',
        filename: '',
        created: false,
        error: error instanceof Error ? error.message : 'Failed to save prompt',
      } as SavePromptResponse);
    }
  });

  // FR-22: GET /api/assets/prompt/:filename - Read a prompt file for editing
  // NFR-6: Using projectDirectory with getProjectPaths()
  router.get('/prompt/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;

    try {
      // Parse filename to extract components
      const parsed = parsePromptFilename(filename);
      if (!parsed) {
        res.status(400).json({ success: false, error: 'Invalid prompt filename format' });
        return;
      }

      // Determine file path
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const filePath = path.join(paths.images, filename);

      if (!await fs.pathExists(filePath)) {
        res.status(404).json({ success: false, error: 'Prompt file not found' });
        return;
      }

      // Read the content
      const content = await fs.readFile(filePath, 'utf-8');

      res.json({
        filename,
        content,
        chapter: parsed.chapter,
        sequence: parsed.sequence,
        imageOrder: parsed.imageOrder,
        variant: parsed.variant,
        label: parsed.label,
      } as LoadPromptResponse);
    } catch (error) {
      console.error('Error loading prompt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load prompt',
      });
    }
  });

  // FR-38: DELETE /api/assets/prompt/:filename - Delete a prompt file (Option B)
  router.delete('/prompt/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;

    try {
      // Validate filename format
      const parsed = parsePromptFilename(filename);
      if (!parsed) {
        res.status(400).json({ success: false, error: 'Invalid prompt filename format' });
        return;
      }

      // Determine file path
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const filePath = path.join(paths.images, filename);

      if (!await fs.pathExists(filePath)) {
        // File doesn't exist - consider it a success (idempotent)
        res.json({ success: true, filename, deleted: false });
        return;
      }

      // Delete the file
      await fs.remove(filePath);
      console.log(`Deleted prompt: ${filename}`);

      res.json({ success: true, filename, deleted: true });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete prompt',
      });
    }
  });

  // FR-49: DELETE /api/assets/images/:filename - Delete an assigned image (move to -trash/)
  router.delete('/images/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;

    try {
      // Validate filename - must be parseable as an image filename
      const parsed = parseImageFilename(filename);
      if (!parsed) {
        res.status(400).json({ success: false, error: 'Invalid image filename format' });
        return;
      }

      // Get paths
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const filePath = path.join(paths.images, filename);

      if (!await fs.pathExists(filePath)) {
        // File doesn't exist - consider it a success (idempotent)
        res.json({ success: true, filename, deleted: false });
        return;
      }

      // Ensure trash directory exists
      const trashDir = path.join(expandPath(config.projectDirectory), '-trash');
      await fs.ensureDir(trashDir);

      // Move to trash (handle duplicates)
      let trashPath = path.join(trashDir, filename);
      let counter = 1;
      while (await fs.pathExists(trashPath)) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        trashPath = path.join(trashDir, `${base}-${counter}${ext}`);
        counter++;
      }

      await fs.move(filePath, trashPath);
      console.log(`Deleted assigned image: ${filename} -> ${trashPath}`);

      res.json({ success: true, filename, deleted: true, trashPath });
    } catch (error) {
      console.error('Error deleting assigned image:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete image',
      });
    }
  });

  // FR-42: POST /api/assets/clipboard/assign - Save clipboard image directly to assets/images/
  router.post('/clipboard/assign', async (req: Request, res: Response) => {
    const { imageData, chapter, sequence, imageOrder, variant, label } = req.body;

    // Validate required fields
    if (!imageData) {
      res.status(400).json({ success: false, error: 'Image data is required' });
      return;
    }
    if (!chapter || !sequence || !imageOrder || !label) {
      res.status(400).json({ success: false, error: 'Missing required fields: chapter, sequence, imageOrder, label' });
      return;
    }

    // Validate naming rules
    if (!NAMING_RULES.chapter.pattern.test(chapter)) {
      res.status(400).json({ success: false, error: 'Invalid chapter format (must be 2 digits)' });
      return;
    }
    if (!NAMING_RULES.sequence.pattern.test(sequence)) {
      res.status(400).json({ success: false, error: 'Invalid sequence format' });
      return;
    }
    const labelError = validateLabel(label);
    if (labelError) {
      res.status(400).json({ success: false, error: labelError });
      return;
    }

    try {
      // Parse base64 data (format: data:image/png;base64,xxxxx)
      const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!matches) {
        res.status(400).json({ success: false, error: 'Invalid image data format' });
        return;
      }

      const [, format, base64Data] = matches;
      const ext = format === 'jpeg' ? '.jpg' : `.${format}`;
      const buffer = Buffer.from(base64Data, 'base64');

      // Build filename
      const filename = buildImageFilename(chapter, sequence, imageOrder, variant || null, label, ext);

      // Get target path
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const targetPath = path.join(paths.images, filename);

      // Ensure directory exists
      await fs.ensureDir(paths.images);

      // Write the file
      await fs.writeFile(targetPath, buffer);

      console.log(`Clipboard image assigned: ${filename}`);

      res.json({
        success: true,
        filename,
        path: targetPath,
      });
    } catch (error) {
      console.error('Error saving clipboard image:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save clipboard image',
      });
    }
  });

  // FR-42: POST /api/assets/clipboard/incoming - Save clipboard image to incoming folder
  router.post('/clipboard/incoming', async (req: Request, res: Response) => {
    const { imageData } = req.body;

    if (!imageData) {
      res.status(400).json({ success: false, error: 'Image data is required' });
      return;
    }

    try {
      // Parse base64 data
      const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!matches) {
        res.status(400).json({ success: false, error: 'Invalid image data format' });
        return;
      }

      const [, format, base64Data] = matches;
      const ext = format === 'jpeg' ? '.jpg' : `.${format}`;
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate timestamp-based filename: clip-2024-12-04-143052.png
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '-')
        .slice(0, 15);  // YYYYMMDD-HHMMSS
      const filename = `clip-${timestamp}${ext}`;

      // Get incoming folder path
      const incomingDir = expandPath(config.imageSourceDirectory || '~/Downloads');
      const targetPath = path.join(incomingDir, filename);

      // Ensure directory exists
      await fs.ensureDir(incomingDir);

      // Write the file
      await fs.writeFile(targetPath, buffer);

      console.log(`Clipboard image saved to incoming: ${filename}`);

      res.json({
        success: true,
        filename,
        path: targetPath,
      });
    } catch (error) {
      console.error('Error saving clipboard image to incoming:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save clipboard image',
      });
    }
  });

  return router;
}
