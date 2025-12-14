import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { getProjectPaths } from '../../../shared/paths.js';

// Supported image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// Check if a ZIP file contains any image files
function zipContainsImages(zipPath: string): { hasImages: boolean; imageCount: number; imageNames: string[] } {
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    const imageNames: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const ext = path.extname(entry.entryName).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        // Get just the filename, not the full path in ZIP
        const filename = path.basename(entry.entryName);
        // Skip macOS metadata files
        if (!filename.startsWith('._') && !filename.startsWith('.')) {
          imageNames.push(filename);
        }
      }
    }

    return {
      hasImages: imageNames.length > 0,
      imageCount: imageNames.length,
      imageNames,
    };
  } catch (err) {
    // ZIP parsing error - log but return empty result
    console.warn(`Failed to parse ZIP file ${zipPath}:`, err);
    return { hasImages: false, imageCount: 0, imageNames: [] };
  }
}

// Get the thumbs directory for the current project
// NFR-6: Using projectDirectory with getProjectPaths()
function getThumbsDir(config: Config): string {
  const paths = getProjectPaths(expandPath(config.projectDirectory));
  return paths.thumbs;
}

export interface ThumbInfo {
  filename: string;
  path: string;
  size: number;
  timestamp: string;
  order: number;  // 1, 2, or 3 from thumb-{n}
}

export interface ZipInfo {
  filename: string;
  path: string;
  size: number;
  timestamp: string;
  imageCount: number;
}

export interface ZipImagePreview {
  name: string;
  size: number;
  dataUrl: string;  // base64 encoded image for preview
}

export function createThumbRoutes(config: Config): Router {
  const router = Router();

  // GET /api/thumbs/zips - List ZIP files in ~/Downloads that contain images
  router.get('/zips', async (_req: Request, res: Response) => {
    try {
      const downloadsDir = path.join(os.homedir(), 'Downloads');

      if (!await fs.pathExists(downloadsDir)) {
        res.json({ zips: [] });
        return;
      }

      const entries = await fs.readdir(downloadsDir, { withFileTypes: true });
      const zipFiles = entries.filter(e =>
        e.isFile() && e.name.toLowerCase().endsWith('.zip')
      );

      const zips: ZipInfo[] = [];

      for (const file of zipFiles) {
        const filePath = path.join(downloadsDir, file.name);
        const stats = await fs.stat(filePath);
        const { hasImages, imageCount } = zipContainsImages(filePath);

        if (hasImages) {
          zips.push({
            filename: file.name,
            path: filePath,
            size: stats.size,
            timestamp: stats.mtime.toISOString(),
            imageCount,
          });
        }
      }

      // Sort by timestamp (newest first)
      zips.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      res.json({ zips });
    } catch (error) {
      console.error('Error listing ZIP files:', error);
      res.status(500).json({
        zips: [],
        error: error instanceof Error ? error.message : 'Failed to list ZIP files',
      });
    }
  });

  // GET /api/thumbs/zip/:filename/contents - Preview images in a ZIP file
  router.get('/zip/:filename/contents', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const downloadsDir = path.join(os.homedir(), 'Downloads');
      const zipPath = path.join(downloadsDir, filename);

      if (!await fs.pathExists(zipPath)) {
        res.status(404).json({ success: false, error: 'ZIP file not found' });
        return;
      }

      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();
      const images: ZipImagePreview[] = [];

      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const ext = path.extname(entry.entryName).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(ext)) continue;

        const entryFilename = path.basename(entry.entryName);
        // Skip macOS metadata files
        if (entryFilename.startsWith('._') || entryFilename.startsWith('.')) continue;

        // Get the image data as base64
        const buffer = entry.getData();
        const mimeType = ext === '.png' ? 'image/png' :
                        ext === '.webp' ? 'image/webp' : 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

        images.push({
          name: entryFilename,
          size: buffer.length,
          dataUrl,
        });
      }

      // Sort alphabetically by name
      images.sort((a, b) => a.name.localeCompare(b.name));

      res.json({ images });
    } catch (error) {
      console.error('Error reading ZIP contents:', error);
      res.status(500).json({
        images: [],
        error: error instanceof Error ? error.message : 'Failed to read ZIP contents',
      });
    }
  });

  // POST /api/thumbs/import - Import selected images from a ZIP file
  router.post('/import', async (req: Request, res: Response) => {
    try {
      const { zipFilename, selectedImages } = req.body;

      if (!zipFilename || !selectedImages || !Array.isArray(selectedImages)) {
        res.status(400).json({ success: false, error: 'zipFilename and selectedImages array required' });
        return;
      }

      if (selectedImages.length === 0 || selectedImages.length > 3) {
        res.status(400).json({ success: false, error: 'Select 1-3 images to import' });
        return;
      }

      const downloadsDir = path.join(os.homedir(), 'Downloads');
      const zipPath = path.join(downloadsDir, zipFilename);

      if (!await fs.pathExists(zipPath)) {
        res.status(404).json({ success: false, error: 'ZIP file not found' });
        return;
      }

      const thumbsDir = getThumbsDir(config);
      await fs.ensureDir(thumbsDir);

      // Clear existing thumbs
      const existingFiles = await fs.readdir(thumbsDir);
      for (const file of existingFiles) {
        if (file.startsWith('thumb-')) {
          await fs.remove(path.join(thumbsDir, file));
        }
      }

      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();
      const imported: string[] = [];

      // Find and extract selected images
      let thumbIndex = 1;
      for (const imageName of selectedImages) {
        const entry = entries.find(e => path.basename(e.entryName) === imageName);
        if (entry) {
          const ext = path.extname(imageName).toLowerCase();
          const newFilename = `thumb-${thumbIndex}${ext}`;
          const destPath = path.join(thumbsDir, newFilename);

          const buffer = entry.getData();
          await fs.writeFile(destPath, buffer);

          imported.push(newFilename);
          thumbIndex++;
        }
      }

      console.log(`Imported ${imported.length} thumbnails from ${zipFilename}`);

      res.json({
        success: true,
        imported,
        count: imported.length,
      });
    } catch (error) {
      console.error('Error importing from ZIP:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import from ZIP',
      });
    }
  });

  // GET /api/thumbs - List current thumbnails in assets/thumbs/
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const thumbsDir = getThumbsDir(config);

      if (!await fs.pathExists(thumbsDir)) {
        res.json({ thumbs: [] });
        return;
      }

      const entries = await fs.readdir(thumbsDir, { withFileTypes: true });
      const thumbFiles = entries.filter(e =>
        e.isFile() && e.name.startsWith('thumb-')
      );

      const thumbs: ThumbInfo[] = [];

      for (const file of thumbFiles) {
        const filePath = path.join(thumbsDir, file.name);
        const stats = await fs.stat(filePath);

        // Parse order from filename (thumb-1.png -> 1)
        const match = file.name.match(/^thumb-(\d+)/);
        const order = match ? parseInt(match[1], 10) : 0;

        thumbs.push({
          filename: file.name,
          path: filePath,
          size: stats.size,
          timestamp: stats.mtime.toISOString(),
          order,
        });
      }

      // Sort by order
      thumbs.sort((a, b) => a.order - b.order);

      res.json({ thumbs });
    } catch (error) {
      console.error('Error listing thumbnails:', error);
      res.status(500).json({
        thumbs: [],
        error: error instanceof Error ? error.message : 'Failed to list thumbnails',
      });
    }
  });

  // GET /api/thumbs/image/:filename - Serve a thumbnail image
  router.get('/image/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const thumbsDir = getThumbsDir(config);
      const filePath = path.join(thumbsDir, filename);

      if (!await fs.pathExists(filePath)) {
        res.status(404).json({ success: false, error: 'Thumbnail not found' });
        return;
      }

      const ext = path.extname(filename).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' :
                      ext === '.webp' ? 'image/webp' : 'image/jpeg';

      res.contentType(mimeType);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving thumbnail:', error);
      res.status(500).json({ success: false, error: 'Failed to serve thumbnail' });
    }
  });

  // POST /api/thumbs/reorder - Rename files to match new order
  router.post('/reorder', async (req: Request, res: Response) => {
    try {
      const { order } = req.body;

      if (!order || !Array.isArray(order)) {
        res.status(400).json({ success: false, error: 'order array required' });
        return;
      }

      const thumbsDir = getThumbsDir(config);

      if (!await fs.pathExists(thumbsDir)) {
        res.status(404).json({ success: false, error: 'Thumbnails directory not found' });
        return;
      }

      // First, rename all to temp names to avoid collisions
      const tempNames: Map<string, string> = new Map();
      for (let i = 0; i < order.length; i++) {
        const oldName = order[i];
        const oldPath = path.join(thumbsDir, oldName);
        if (await fs.pathExists(oldPath)) {
          const ext = path.extname(oldName);
          const tempName = `_temp_${i}${ext}`;
          const tempPath = path.join(thumbsDir, tempName);
          await fs.rename(oldPath, tempPath);
          tempNames.set(tempName, `thumb-${i + 1}${ext}`);
        }
      }

      // Then rename from temp to final names
      for (const [tempName, finalName] of tempNames) {
        const tempPath = path.join(thumbsDir, tempName);
        const finalPath = path.join(thumbsDir, finalName);
        await fs.rename(tempPath, finalPath);
      }

      console.log(`Reordered thumbnails: ${order.join(' -> ')}`);

      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering thumbnails:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder thumbnails',
      });
    }
  });

  // DELETE /api/thumbs/zip/:filename - Delete a ZIP file from Downloads
  router.delete('/zip/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const downloadsDir = path.join(os.homedir(), 'Downloads');
      const zipPath = path.join(downloadsDir, filename);

      if (!await fs.pathExists(zipPath)) {
        res.status(404).json({ success: false, error: 'ZIP file not found' });
        return;
      }

      // Security check: ensure we're deleting from Downloads only
      const realZipPath = await fs.realpath(zipPath);
      const realDownloadsDir = await fs.realpath(downloadsDir);
      if (!realZipPath.startsWith(realDownloadsDir)) {
        res.status(403).json({ success: false, error: 'Cannot delete files outside Downloads' });
        return;
      }

      await fs.remove(zipPath);
      console.log(`Deleted ZIP file: ${filename}`);

      res.json({ success: true, deleted: filename });
    } catch (error) {
      console.error('Error deleting ZIP file:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete ZIP file',
      });
    }
  });

  // DELETE /api/thumbs/:filename - Delete a thumbnail and renumber remaining
  router.delete('/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const thumbsDir = getThumbsDir(config);
      const filePath = path.join(thumbsDir, filename);

      if (!await fs.pathExists(filePath)) {
        res.status(404).json({ success: false, error: 'Thumbnail not found' });
        return;
      }

      // Get the order number of the deleted file
      const match = filename.match(/^thumb-(\d+)/);
      const deletedOrder = match ? parseInt(match[1], 10) : 0;

      // Delete the file
      await fs.remove(filePath);

      // Renumber remaining files to fill the gap
      const entries = await fs.readdir(thumbsDir);
      const remainingThumbs = entries
        .filter(f => f.startsWith('thumb-'))
        .map(f => {
          const m = f.match(/^thumb-(\d+)/);
          return { filename: f, order: m ? parseInt(m[1], 10) : 0 };
        })
        .filter(t => t.order > deletedOrder)
        .sort((a, b) => a.order - b.order);

      // Shift higher numbers down
      for (const thumb of remainingThumbs) {
        const oldPath = path.join(thumbsDir, thumb.filename);
        const ext = path.extname(thumb.filename);
        const newName = `thumb-${thumb.order - 1}${ext}`;
        const newPath = path.join(thumbsDir, newName);
        await fs.rename(oldPath, newPath);
      }

      console.log(`Deleted thumbnail: ${filename}`);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete thumbnail',
      });
    }
  });

  return router;
}
