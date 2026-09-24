# Schema mirror

> Generated from the code, not written about it. Do not hand-edit — every line below is anchored to a `file:line` and is re-derived on every run. `verify_mirror.py` fails when this page no longer matches its JSON. To record a gap the extractor cannot find, use `docs/schema-mirror.known-gaps.json`.

- **stack** `typescript` · **extractor** `extract_typescript.py`
- **commit** `f58866de5d00` · **generated** 2026-09-24T23:47:34+00:00
- **scope** include `*.ts`, `*.tsx` · exclude `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `*.stories.tsx`, `*.config.ts`, `*/test/*`, `*/tests/*`, `*/__tests__/*`, `*/e2e/*`, `*/__mocks__/*`, `*/fixtures/*`, `*.d.ts`, `*/dist/*`, `*/build/*`, `*/out/*`
- **zod bound** in 2 file(s) by a direct import, 0 through a re-export, 0 by call shape only

| shapes | declared sets | derived sets | gaps | declared but not read | findings |
|---|---|---|---|---|---|
| 334 | 87 | 16 | 2 | 43 | 16 |

> **Read the gaps, the census and the never-read list before trusting the shape.** Derived sets have no declaring symbol and will drift silently. Gaps are things this mirror could not reach — they are not absences in the code.

## Index

Top-level entries by file, with the line each is declared on. Search the page for the name.

- `client/src/App.tsx` — `ViewTab` (set) :52 · `NamingState` :97
- `client/src/components/ApiExplorer.tsx` — `ParamValues` :14 · `ApiResponse` :19 · `ApiExplorerProps` :27
- `client/src/components/AssetsPage.tsx` — `VariantOption` (set) :29 · `PairedAsset` :32 · `ThumbnailSize` (set) :45 · `AssignmentState` :77 · `stored (membership)` (set) :206 · `stored (membership) #2` (set) :214 · `ImageCardProps` :1362
- `client/src/components/ChapterContextPanel.tsx` — `ChapterContextPanelProps` :6 · `ChapterSummary` :10
- `client/src/components/ChapterHelpPanel.tsx` — `HelpSectionProps` :166
- `client/src/components/ChapterPanel.tsx` — `ChapterInfo` :6 · `ChapterPanelProps` :14
- `client/src/components/ClipboardPasteModal.tsx` — `ClipboardPasteModalProps` :4
- `client/src/components/ConfigPanel.tsx` — `PathExistsStatus` (set) :19 · `ConfigTab` (set) :218 · `ConfigPanelProps` :250 · `preset (branching)` (set) :842
- `client/src/components/ConnectionIndicator.tsx` — `ConnectionState` (set) :3 · `ConnectionIndicatorProps` :5
- `client/src/components/ContextRefusedBanner.tsx` — `ContextRefusedBannerProps` :5
- `client/src/components/DeveloperDrawer.tsx` — `DeveloperDrawerProps` :29 · `FileTab` (set) :34
- `client/src/components/DiscardModal.tsx` — `DiscardModalProps` :1
- `client/src/components/FileCard.tsx` — `FileCardProps` :10
- `client/src/components/HeaderDropdown.tsx` — `DropdownItem` :6 · `HeaderDropdownProps` :13
- `client/src/components/HoldDeleteModal.tsx` — `HoldDeleteModalProps` :9
- `client/src/components/ImagePreviewOverlay.tsx` — `LegacyPreviewImage` :6 · `ImagePreviewOverlayProps` :13
- `client/src/components/InboxPage.tsx` — `VIEWABLE_EXTENSIONS` (set) :19 · `SelectedFile` :55
- `client/src/components/IncomingVideoModal.tsx` — `IncomingVideoModalProps` :12
- `client/src/components/ManagePanel.tsx` — `ChapterGroup` :33 · `ActiveTool` (set) :87 · `ManagePanelProps` :89
- `client/src/components/MicCheckSnapshot.tsx` — `Phase` (set) :35 · `VerdictRowData` :41
- `client/src/components/NamingControls.tsx` — `NamingControlsProps` :29
- `client/src/components/NewProjectForm.tsx` — `NewProjectFormProps` :15
- `client/src/components/ProjectDeleteModal.tsx` — `ProjectDeleteModalProps` :8
- `client/src/components/ProjectDrawer.tsx` — `ProjectDrawerProps` :38
- `client/src/components/ProjectListToolbar.tsx` — `ProjectListToolbarProps` :32
- `client/src/components/ProjectStatsPopup.tsx` — `Props` :17
- `client/src/components/ProjectsPanel.tsx` — `ProjectsPanelProps` :36
- `client/src/components/RecentlyNamedStrip.tsx` — `RecentlyNamedStripProps` :13
- `client/src/components/RecordingVideoModal.tsx` — `RecordingVideoModalProps` :11
- `client/src/components/RecordingsView.tsx` — `ChapterGroup` :49 · `ChapterGroupWithTiming` :58
- `client/src/components/ThumbsPage.tsx` — `ThumbnailSize` (set) :24 · `PreviewData` :34
- `client/src/components/TranscriptModal.tsx` — `TranscriptContentResponseExtended` :11 · `TranscriptModalProps` :21
- `client/src/components/TranscriptSyncModal.tsx` — `Props` :7
- `client/src/components/TranscriptSyncPanel.tsx` — `HighlightMode` (set) :16 · `Props` :18
- `client/src/components/TranscriptionProgressBar.tsx` — `TranscriptionProgressBarProps` :7
- `client/src/components/TranscriptionsPage.tsx` — `status (switch)` (set) :254
- `client/src/components/VideoTranscriptModal.tsx` — `VideoTranscriptModalProps` :9 · `CombinedTranscriptResponse` :13
- `client/src/components/WatchPage.tsx` — `VideoSize` (set) :55 · `ChapterGroup` :81 · `VideoMeta` :156
- `client/src/components/shared/BatchToolbar.tsx` — `BatchToolbarProps` :12 · `PopoverType` (set) :26
- `client/src/components/shared/ConfirmationModal.tsx` — `ConfirmationModalProps` :8
- `client/src/components/shared/DictionaryQuickAdd.tsx` — `DictionaryQuickAddProps` :5
- `client/src/components/shared/EditableFileRow.tsx` — `EditableFileRowProps` :18
- `client/src/components/shared/ErrorMessage.tsx` — `ErrorMessageProps` :1
- `client/src/components/shared/FileViewerModal.tsx` — `FileViewerModalProps` :18
- `client/src/components/shared/InlineTitle.tsx` — `InlineTitleProps` :5
- `client/src/components/shared/LoadingSpinner.tsx` — `LoadingSpinnerProps` :1
- `client/src/components/shared/OpenFolderButton.tsx` — `OpenFolderButtonProps` :4
- `client/src/components/shared/PageContainer.tsx` — `PageContainerProps` :3
- `client/src/components/shared/PageHeader.tsx` — `PageHeaderProps` :3
- `client/src/components/shared/PlayPauseButton.tsx` — `PlayPauseButtonProps` :4
- `client/src/components/shared/PreviewPanel.tsx` — `PreviewChange` :8 · `PreviewPanelProps` :15
- `client/src/components/shared/SelectionBadge.tsx` — `SelectionBadgeProps` :11
- `client/src/components/shared/SizeToggle.tsx` — `SizeToggleProps` :3
- `client/src/components/shared/SlideOutDrawer.tsx` — `SlideOutDrawerProps` :10
- `client/src/components/shared/SpeedControl.tsx` — `SpeedControlProps` :4
- `client/src/components/shared/SplitMarker.tsx` — `SplitMarkerProps` :8
- `client/src/components/shared/StoragePanel.tsx` — `StoragePanelProps` :43
- `client/src/components/shared/ToolsSidebar.tsx` — `ToolsSidebarProps` :13 · `ToolButtonProps` :81
- `client/src/components/shared/UndoToast.tsx` — `UndoToastProps` :10
- `client/src/components/shared/VideoControlsBar.tsx` — `VIDEO_SIZES` (set) :15 · `VideoControlsBarProps` :18
- `client/src/components/shared/VideoPlayerModal.tsx` — `VideoSize` (set) :21 · `VideoPlayerModalProps` :23
- `client/src/components/shared/storage/StorageActions.tsx` — `StorageActionsProps` :19 · `PopoverName` (set) :35
- `client/src/components/shared/storage/StorageActivityFeed.tsx` — `StorageActivityFeedProps` :14
- `client/src/components/shared/storage/StorageStateHeader.tsx` — `Props` :5
- `client/src/components/shared/storage/StorageTree.tsx` — `Props` :14
- `client/src/hooks/useAssetApi.ts` — `ClipboardAssignRequest` :180
- `client/src/hooks/useBestTake.ts` — `BestTakeResult` :5
- `client/src/hooks/useBrandsApi.ts` — `BrandInfo` :5
- `client/src/hooks/useBrollApi.ts` — `BrollFile` :6
- `client/src/hooks/useConfigApi.ts` — `WatcherInfo` :51 · `BrandConfigAffiliate` :65 · `BrandConfigRaw` :70
- `client/src/hooks/useEditApi.ts` — `PrepData` :15
- `client/src/hooks/useMicAnalyser.ts` — `MicStatus` (set) :54 · `MicMode` (set) :61 · `MicMetrics` :63 · `ConstraintReport` :75 · `DeviceChoice` :86 · `MicError` :91 · `ProbeVerdict` (set) :99 · `ProbeResult` :101
- `client/src/hooks/useOpenFolder.ts` — `OpenFolderOptions` :9
- `client/src/hooks/usePoemWuiApi.ts` — `AwbJsonInfo` :6 · `FliHubChapter` :14 · `PoemWuiStatus` :20 · `SendResult` :36 · `YloResult` :70
- `client/src/hooks/useProjectsApi.ts` — `NextCodeResponse` :286
- `client/src/hooks/useRecordingsApi.ts` — `TrashArtifact` :67 · `TrashPreviewItem` :75 · `TrashRecordingsResponse` :81
- `client/src/hooks/useShiftHover.ts` — `ImagePreview` :3 · `TextPreview` :11 · `PreviewContent` :17 · `PreviewState` :19 · `UseShiftHoverReturn` :32
- `client/src/hooks/useThumbsApi.ts` — `ThumbInfo` :6 · `ZipInfo` :14 · `ZipImagePreview` :22
- `client/src/hooks/useVideoAspect.ts` — `UseVideoAspectReturn` :14
- `client/src/hooks/useVideoPlayback.ts` — `UseVideoPlaybackOptions` :14 · `UseVideoPlaybackReturn` :21
- `client/src/utils/fileActions.ts` — `TrashResult` :3 · `DiscardResult` :9
- `client/src/utils/formatting.ts` — `TimeFormatStyle` (set) :52
- `client/src/utils/micGrading.ts` — `Grade` (set) :22 · `Reading` :24 · `LoudnessInput` :73 · `PeakInput` :142 · `ClipInput` :192
- `client/src/utils/micTrajectory.ts` — `Direction` (set) :33 · `SparkPoint` :35 · `ChangeEvent` :40 · `TrajectoryReading` :47 · `PendingStep` :62
- `client/src/utils/micZones.ts` — `ZoneKind` (set) :12 · `TrackZone` :14 · `TrackSpec` :20
- `client/src/utils/projectFilters.ts` — `FilterOptions` :11 · `activePreset (branching)` (set) :39
- `client/src/utils/srt.ts` — `SrtEntry` :10 · `TimedWord` :20
- `server/src/WatcherManager.ts` — `WatcherConfig` :19
- `server/src/config/env.ts` — `envSchema` :5
- `server/src/routes/assets.ts` — `IMAGE_EXTENSIONS` (set) :30
- `server/src/routes/index.ts` — `RecentRename` :52
- `server/src/routes/projects.ts` — `priority (membership)` (set) :148
- `server/src/routes/query/recordings.ts` — `UnifiedRecording` :20
- `server/src/routes/thumbs.ts` — `IMAGE_EXTENSIONS` (set) :11 · `ThumbInfo` :57 · `ZipInfo` :65 · `ZipImagePreview` :73
- `server/src/routes/transcriptions.ts` — `scope (membership)` (set) :637
- `server/src/routes/video.ts` — `folder (branching)` (set) :81 · `ext (membership)` (set) :161 · `ext (membership) #2` (set) :242
- `server/src/scripts/scanProjects.ts` — `DiscrepancyType` (set) :30 · `DiscrepancySeverity` (set) :31 · `Discrepancy` :33 · `ProjectScanResult` :44 · `ScanSummary` :51
- `server/src/utils/archiveInventory.ts` — `BuildArchiveRowOpts` :82
- `server/src/utils/aspectCheck.ts` — `Size` :18 · `AspectCheckDeps` :128
- `server/src/utils/brands.ts` — `BrandInfo` :13 · `BrandsFileEntry` :23
- `server/src/utils/chapterExtraction.ts` — `SrtSegment` :31 · `ChapterInfo` :40 · `MatchResult` :264 · `InternalChapterResult` :549
- `server/src/utils/chapterRecording.ts` — `SegmentInfo` :14 · `ChapterSegments` :23
- `server/src/utils/diskUtils.ts` — `NodeDirent` :39
- `server/src/utils/finalMedia.ts` — `FinalMediaLocation` (set) :16 · `FinalVideoInfo` :19 · `FinalSrtInfo` :27 · `AdditionalSegment` :34 · `FinalMediaResponse` :40
- `server/src/utils/loopback.ts` — `LOOPBACK_HOSTS` (set) :13
- `server/src/utils/micCheckStore.ts` — `StartSessionInput` :57 · `FinishSessionInput` :264
- `server/src/utils/nextProjectCode.ts` — `SeriesCode` :21 · `NextCodeResult` :71
- `server/src/utils/openContext.ts` — `ContextDeps` :46 · `ApplyResult` :57 · `Resolution` :64
- `server/src/utils/projectStats.ts` — `ProjectStatsRaw` :51 · `GetProjectStatsOptions` :99
- `server/src/utils/recordingArtifacts.ts` — `ArtifactKind` (set) :14 · `RecordingArtifact` :16
- `server/src/utils/reporters.ts` — `ProjectSummary` :26 · `ProjectDetail` :43 · `Recording` :71 · `Transcript` :83 · `Chapter` :93 · `Image` :103 · `ExportData` :406
- `server/src/utils/responses.ts` — `ErrorResponse` :14
- `server/src/utils/s3Utils.ts` — `MigrationActions` :8
- `server/src/utils/safeDelete.ts` — `SafeDeleteRule` :8 · `SafeDeleteResult` :14
- `server/src/utils/safeMigration.ts` — `MigrationResult` :16
- `server/src/utils/scanning.ts` — `ProjectTimestamps` :86 · `ProjectIndicators` :156
- `server/src/utils/storageActivityLog.ts` — `ReadStorageActivityOpts` :40
- `server/src/utils/storageTree.ts` — `HEAVY_SUBFOLDERS` (set) :23 · `GetStorageTreeOpts` :221
- `server/src/utils/telemetry.ts` — `TranscriptionLogEntry` :19
- `shared/apiRegistry.ts` — `HttpMethod` (set) :6 · `ParameterType` (set) :7 · `DataType` (set) :8 · `ApiParameter` :10 · `ApiEndpoint` :22
- `shared/contextSchemas.ts` — `NonEmpty` :9 · `OpenContextArgSchema` (set) :11 · `HubContextSchema` :18 · `ContextRefusalSchema` :48 · `OpenContextStateSchema` :55
- `shared/naming.ts` — `ParsedRecording` :127 · `ParsedImageAsset` :133 · `ParseOptions` :148
- `shared/paths.ts` — `ProjectPaths` :38
- `shared/types.ts` — `MachineRole` (set) :4 · `FileInfo` :6 · `ProjectAspectValue` (set) :18 · `AspectCheck` :19 · `ChapterFilter` :33 · `CommonName` :39 · `Config` :46 · `DiskSizeData` :76 · `TrashSummaryResponse` :95 · `DiskThresholdConfig` :105 · `DiskThresholds` :112 · `DiskThresholdLevel` (set) :123 · `HoldLocation` (set) :126 · `HoldVerification` :129 · `HoldStatus` :138 · `ArchiveState` (set) :151 · `ArchiveRow` :153 · `ArchiveInventoryResponse` :168 · `StorageState` (set) :177 · `StorageClassification` (set) :178 · `StorageLocation` (set) :179 · `StorageTreeNode` :181 · `StorageTreeSizes` :190 · `StorageTreePaths` :198 · `StorageTreeResponse` :204 · `StorageMutationResponse` :220 · `StorageActivityAction` (set) :229 · `StorageActivityEntry` :231 · `StorageActivityResponse` :238 · `HoldOperationResult` :245 · `RenameRequest` :253 · `RenameResponse` :262 · `SuggestedNaming` :275 · `ProjectInfo` :283 · `ProjectPriority` (set) :291 · `ProjectStage` (set) :294 · `TranscriptSyncStatus` :338 · `TranscriptSyncResponse` :345 · `ProjectStats` :353 · `RecordingFile` :402 · `ImageInfo` :420 · `ImageAsset` :431 · `AssignImageRequest` :445 · `AssignImageResponse` :455 · `NextImageOrderResponse` :463 · `PromptAsset` :471 · `SavePromptRequest` :487 · `SavePromptResponse` :497 · `LoadPromptResponse` :507 · `ServerToClientEvents` :518 · `ClientToServerEvents` :562 · `TranscriptionStatus` (set) :567 · `TranscriptionJob` :570 · `TranscriptionsResponse` :585 · `TranscriptionStatusResponse` :592 · `TranscriptContentResponse` :599 · `FileContentResponse` :605 · `FinalMediaLocation` (set) :614 · `FinalVideoInfo` :616 · `FinalSrtInfo` :624 · `AdditionalSegment` :631 · `FinalMediaResponse` :637 · `ChapterMatchStatus` (set) :645 · `ChapterMatchCandidate` :648 · `ChapterMatch` :656 · `ChaptersResponse` :671 · `ChapterVerifyRequest` :687 · `ChapterVerifyResponse` :702 · `ChapterOverride` :717 · `SetChapterOverrideRequest` :728 · `SetChapterOverrideResponse` :737 · `ChapterRecordingConfig` :744 · `ChapterRecordingRequest` :752 · `ChapterRecordingResponse` :759 · `ChapterGenerationProgress` :767 · `QueryProjectSummary` :779 · `QueryProjectDetail` :803 · `QueryRecording` :833 · `QueryTranscript` :849 · `QueryChapter` :860 · `QueryImage` :872 · `SafeResponse` :887 · `RestoreResponse` :896 · `ParkResponse` :905 · `UnparkResponse` :914 · `RenameChapterResponse` :923 · `QueueAllResponse` :930 · `RecentRename` :942 · `InboxFile` :951 · `InboxSubfolder` :958 · `InboxResponse` :966 · `ChapterRecordingStatusResponse` :975 · `EnvironmentResponse` :987 · `RecordingState` :1004 · `ChapterState` :1013 · `ProjectShips` (set) :1036 · `ProjectState` :1039 · `ProjectStateResponse` :1050 · `UpdateProjectStateRequest` :1057 · `EditManifestFile` :1066 · `EditFolderManifest` :1074 · `EditManifest` :1080 · `FolderKey` (set) :1087 · `EditFolderKey` (set) :1108 · `ManifestFileStatus` :1111 · `ManifestStatus` (set) :1119 · `ManifestStatusDetail` :1121 · `ManifestStatusResponse` :1132 · `CleanEditFolderResponse` :1140 · `RestoreEditFolderResponse` :1151 · `SplitChapterRequest` :1161 · `SplitChapterResponse` :1166 · `UndoRenameResponse` :1177 · `MicCheckMode` (set) :1195 · `MicCheckTick` :1197 · `MicCheckEventKind` (set) :1225 · `MicCheckEvent` :1240 · `MicCheckConstraints` :1249 · `MicCheckProbeVerdict` (set) :1256 · `MicCheckProbe` :1258 · `MicCheckNotMeasured` :1271 · `MicCheckDevice` :1276 · `MicCheckSummary` :1283 · `MicCheckSession` :1297 · `MicCheckSessionListEntry` :1316 · `MicCheckLiveResponse` :1337

## Never read by this extractor

These constructs are outside what this extractor reads **on every run, in every repo**. A page with no gaps is still partial by exactly this list.

- classes - a class's fields are never mirrored (the census lists each one)
- generic, mapped and conditional type aliases
- template-literal types, and unions that contain one
- aliases of another type or value (`X = Y`), and utility-type aliases (`Pick<>`, `Omit<>`, `Record<>`)
- `keyof typeof X` / indexed-access types, unless X itself is read as a closed set
- results of `.pick` / `.omit` / `.partial` / `.required` (listed as gaps where met)
- zod schemas built inside function bodies, other than a function that returns one zod expression
- the parameterised result of a schema helper or factory call (listed as gaps where met)
- constants that are not exported (the census does not count them)
- `*.d.ts` files and build output (`dist/`, `build/`, `out/`) - excluded by default
- regex-encoded sets, JSON Schema files, and the data actually on disk

## Coverage census

**397** top-level declarations counted = **352** mirrored + **2** listed as gaps + **43** declared but not read.

Counted: every top-level interface, enum, class and type alias (exported or not) and every exported constant, in the files in scope.
Not counted, as not schema-bearing: 1 function, 18 literal constants.

| file | declared | mirrored | gaps | not read |
|---|---|---|---|---|
| `client/src/App.tsx` | 3 | 2 | 0 | **1** |
| `client/src/components/MicCheckSnapshot.tsx` | 3 | 2 | 0 | **1** |
| `client/src/components/shared/ShipsSelector.tsx` | 1 | 0 | 0 | **1** |
| `client/src/config.ts` | 1 | 0 | 0 | **1** |
| `client/src/constants/queryKeys.ts` | 1 | 0 | 0 | **1** |
| `client/src/constants/stages.ts` | 2 | 0 | 0 | **2** |
| `client/src/hooks/useBrollApi.ts` | 2 | 1 | 0 | **1** |
| `client/src/hooks/useOpenContextApi.ts` | 1 | 0 | 0 | **1** |
| `client/src/hooks/useShiftHover.ts` | 6 | 5 | 0 | **1** |
| `client/src/hooks/useStorageApi.ts` | 5 | 0 | 0 | **5** |
| `client/src/hooks/useVideoAspect.ts` | 2 | 1 | 0 | **1** |
| `client/src/hooks/useVideoPlayback.ts` | 3 | 2 | 0 | **1** |
| `client/src/utils/micGrading.ts` | 6 | 5 | 0 | **1** |
| `client/src/utils/micTrajectory.ts` | 6 | 5 | 0 | **1** |
| `server/src/WatcherManager.ts` | 2 | 1 | 0 | **1** |
| `server/src/config/configManager.ts` | 1 | 0 | 0 | **1** |
| `server/src/config/env.ts` | 2 | 0 | 0 | **2** |
| `server/src/config/logger.ts` | 2 | 0 | 0 | **2** |
| `server/src/middleware/errorHandler.ts` | 1 | 0 | 0 | **1** |
| `server/src/routes/miccheck.ts` | 1 | 0 | 0 | **1** |
| `server/src/utils/aspectCheck.ts` | 3 | 2 | 0 | **1** |
| `server/src/utils/formatters.ts` | 1 | 0 | 0 | **1** |
| `server/src/utils/holdUtils.ts` | 1 | 0 | 0 | **1** |
| `server/src/utils/openContext.ts` | 5 | 3 | 0 | **2** |
| `server/src/utils/poemWuiUtils.ts` | 1 | 0 | 0 | **1** |
| `shared/apiRegistry.ts` | 6 | 5 | 0 | **1** |
| `shared/constants.ts` | 2 | 0 | 0 | **2** |
| `shared/contextSchemas.ts` | 11 | 8 | 2 | **1** |
| `shared/naming.ts` | 5 | 3 | 0 | **2** |
| `shared/types.ts` | 130 | 126 | 0 | **4** |

## Closed sets — declared

One symbol states each set. Adding a member changes that symbol, so these cannot drift.

### `client/src/App.ViewTab` — `client/src/App.tsx:52-66`

*literal union type alias `ViewTab` - a single declaring symbol*

| value | declared at |
|---|---|
| `incoming` | `client/src/App.tsx:53` |
| `recordings` | `client/src/App.tsx:54` |
| `watch` | `client/src/App.tsx:55` |
| `transcriptions` | `client/src/App.tsx:56` |
| `inbox` | `client/src/App.tsx:57` |
| `assets` | `client/src/App.tsx:58` |
| `thumbs` | `client/src/App.tsx:59` |
| `export` | `client/src/App.tsx:60` |
| `b-roll` | `client/src/App.tsx:61` |
| `projects` | `client/src/App.tsx:62` |
| `config` | `client/src/App.tsx:63` |
| `mockups` | `client/src/App.tsx:64` |
| `miccheck` | `client/src/App.tsx:65` |
| `api-explorer` | `client/src/App.tsx:66` |

### `client/src/components/AssetsPage.VariantOption` — `client/src/components/AssetsPage.tsx:29`

*literal union type alias `VariantOption` - a single declaring symbol*

| value | declared at |
|---|---|
| `a` | `client/src/components/AssetsPage.tsx:29` |
| `b` | `client/src/components/AssetsPage.tsx:29` |
| `c` | `client/src/components/AssetsPage.tsx:29` |

### `client/src/components/AssetsPage.ThumbnailSize` — `client/src/components/AssetsPage.tsx:45`

*literal union type alias `ThumbnailSize` - a single declaring symbol*

| value | declared at |
|---|---|
| `S` | `client/src/components/AssetsPage.tsx:45` |
| `M` | `client/src/components/AssetsPage.tsx:45` |
| `L` | `client/src/components/AssetsPage.tsx:45` |
| `XL` | `client/src/components/AssetsPage.tsx:45` |

### `client/src/components/ConfigPanel.PathExistsStatus` — `client/src/components/ConfigPanel.tsx:19`

*literal union type alias `PathExistsStatus` - a single declaring symbol*

| value | declared at |
|---|---|
| `unknown` | `client/src/components/ConfigPanel.tsx:19` |
| `checking` | `client/src/components/ConfigPanel.tsx:19` |
| `exists` | `client/src/components/ConfigPanel.tsx:19` |
| `not-found` | `client/src/components/ConfigPanel.tsx:19` |

### `client/src/components/ConfigPanel.ConfigTab` — `client/src/components/ConfigPanel.tsx:218`

*literal union type alias `ConfigTab` - a single declaring symbol*

| value | declared at |
|---|---|
| `directories` | `client/src/components/ConfigPanel.tsx:218` |
| `names` | `client/src/components/ConfigPanel.tsx:218` |
| `collaboration` | `client/src/components/ConfigPanel.tsx:218` |
| `advanced` | `client/src/components/ConfigPanel.tsx:218` |
| `brand` | `client/src/components/ConfigPanel.tsx:218` |

### `client/src/components/ConnectionIndicator.ConnectionState` — `client/src/components/ConnectionIndicator.tsx:3`

*literal union type alias `ConnectionState` - a single declaring symbol*

| value | declared at |
|---|---|
| `connected` | `client/src/components/ConnectionIndicator.tsx:3` |
| `disconnected` | `client/src/components/ConnectionIndicator.tsx:3` |
| `reconnecting` | `client/src/components/ConnectionIndicator.tsx:3` |

### `client/src/components/DeveloperDrawer.FileTab` — `client/src/components/DeveloperDrawer.tsx:34`

*literal union type alias `FileTab` - a single declaring symbol*

| value | declared at |
|---|---|
| `project-state` | `client/src/components/DeveloperDrawer.tsx:34` |
| `config` | `client/src/components/DeveloperDrawer.tsx:34` |
| `telemetry` | `client/src/components/DeveloperDrawer.tsx:34` |

### `client/src/components/FileCard.FileCardProps.takeRank` — `client/src/components/FileCard.tsx:15`

*literal union type of `takeRank` - a single declaring symbol*

| value | declared at |
|---|---|
| `best` | `client/src/components/FileCard.tsx:15` |
| `good` | `client/src/components/FileCard.tsx:15` |

### `client/src/components/HeaderDropdown.HeaderDropdownProps.align` — `client/src/components/HeaderDropdown.tsx:16`

*literal union type of `align` - a single declaring symbol*

| value | declared at |
|---|---|
| `left` | `client/src/components/HeaderDropdown.tsx:16` |
| `right` | `client/src/components/HeaderDropdown.tsx:16` |

### `client/src/components/HoldDeleteModal.HoldDeleteModalProps.target` — `client/src/components/HoldDeleteModal.tsx:13`

*literal union type of `target` - a single declaring symbol*

| value | declared at |
|---|---|
| `local` | `client/src/components/HoldDeleteModal.tsx:13` |
| `holding` | `client/src/components/HoldDeleteModal.tsx:13` |

### `client/src/components/ManagePanel.ActiveTool` — `client/src/components/ManagePanel.tsx:87`

*literal union type alias `ActiveTool` - a single declaring symbol*

| value | declared at |
|---|---|
| `regen` | `client/src/components/ManagePanel.tsx:87` |
| `gling-edit` | `client/src/components/ManagePanel.tsx:87` |
| `awb` | `client/src/components/ManagePanel.tsx:87` |
| `storage` | `client/src/components/ManagePanel.tsx:87` |

### `client/src/components/MicCheckSnapshot.Phase` — `client/src/components/MicCheckSnapshot.tsx:35`

*literal union type alias `Phase` - a single declaring symbol*

| value | declared at |
|---|---|
| `idle` | `client/src/components/MicCheckSnapshot.tsx:35` |
| `testing` | `client/src/components/MicCheckSnapshot.tsx:35` |
| `verdict` | `client/src/components/MicCheckSnapshot.tsx:35` |

### `client/src/components/ThumbsPage.ThumbnailSize` — `client/src/components/ThumbsPage.tsx:24`

*literal union type alias `ThumbnailSize` - a single declaring symbol*

| value | declared at |
|---|---|
| `S` | `client/src/components/ThumbsPage.tsx:24` |
| `M` | `client/src/components/ThumbsPage.tsx:24` |
| `L` | `client/src/components/ThumbsPage.tsx:24` |
| `XL` | `client/src/components/ThumbsPage.tsx:24` |

### `client/src/components/TranscriptModal.TranscriptContentResponseExtended.activeFormat` — `client/src/components/TranscriptModal.tsx:18`

*literal union type of `activeFormat` - a single declaring symbol*

| value | declared at |
|---|---|
| `txt` | `client/src/components/TranscriptModal.tsx:18` |
| `srt` | `client/src/components/TranscriptModal.tsx:18` |

### `client/src/components/TranscriptSyncPanel.HighlightMode` — `client/src/components/TranscriptSyncPanel.tsx:16`

*literal union type alias `HighlightMode` - a single declaring symbol*

| value | declared at |
|---|---|
| `word` | `client/src/components/TranscriptSyncPanel.tsx:16` |
| `phrase` | `client/src/components/TranscriptSyncPanel.tsx:16` |
| `none` | `client/src/components/TranscriptSyncPanel.tsx:16` |

### `client/src/components/WatchPage.VideoSize` — `client/src/components/WatchPage.tsx:55`

*literal union type alias `VideoSize` - a single declaring symbol*

| value | declared at |
|---|---|
| `N` | `client/src/components/WatchPage.tsx:55` |
| `L` | `client/src/components/WatchPage.tsx:55` |

### `client/src/components/shared/BatchToolbar.PopoverType` — `client/src/components/shared/BatchToolbar.tsx:26`

*literal union type alias `PopoverType` - a single declaring symbol*

| value | declared at |
|---|---|
| `rename` | `client/src/components/shared/BatchToolbar.tsx:26` |
| `moveChapter` | `client/src/components/shared/BatchToolbar.tsx:26` |
| `addTag` | `client/src/components/shared/BatchToolbar.tsx:26` |
| `removeTag` | `client/src/components/shared/BatchToolbar.tsx:26` |

### `client/src/components/shared/ConfirmationModal.ConfirmationModalProps.variant` — `client/src/components/shared/ConfirmationModal.tsx:26`

Confirm button color variant

*literal union type of `variant` - a single declaring symbol*

| value | declared at |
|---|---|
| `primary` | `client/src/components/shared/ConfirmationModal.tsx:26` |
| `danger` | `client/src/components/shared/ConfirmationModal.tsx:26` |
| `warning` | `client/src/components/shared/ConfirmationModal.tsx:26` |

### `client/src/components/shared/VideoControlsBar.VIDEO_SIZES` — `client/src/components/shared/VideoControlsBar.tsx:15`

*`as const` array `VIDEO_SIZES`, typed from by `typeof VIDEO_SIZES[number]` - a single declaring symbol*

| value | declared at |
|---|---|
| `N` | `client/src/components/shared/VideoControlsBar.tsx:15` |
| `L` | `client/src/components/shared/VideoControlsBar.tsx:15` |

### `client/src/components/shared/VideoPlayerModal.VideoSize` — `client/src/components/shared/VideoPlayerModal.tsx:21`

*literal union type alias `VideoSize` - a single declaring symbol*

| value | declared at |
|---|---|
| `N` | `client/src/components/shared/VideoPlayerModal.tsx:21` |
| `L` | `client/src/components/shared/VideoPlayerModal.tsx:21` |

### `client/src/components/shared/storage/StorageActions.StorageActionsProps.pendingAction` — `client/src/components/shared/storage/StorageActions.tsx:27`

*literal union type of `pendingAction` - a single declaring symbol*

| value | declared at |
|---|---|
| `hold` | `client/src/components/shared/storage/StorageActions.tsx:27` |
| `restore` | `client/src/components/shared/storage/StorageActions.tsx:27` |
| `archive` | `client/src/components/shared/storage/StorageActions.tsx:27` |
| `held-archive` | `client/src/components/shared/storage/StorageActions.tsx:27` |

### `client/src/components/shared/storage/StorageActions.PopoverName` — `client/src/components/shared/storage/StorageActions.tsx:35`

*literal union type alias `PopoverName` - a single declaring symbol*

| value | declared at |
|---|---|
| `archive` | `client/src/components/shared/storage/StorageActions.tsx:35` |
| `held-archive` | `client/src/components/shared/storage/StorageActions.tsx:35` |

### `client/src/hooks/useBrandsApi.BrandInfo.source` — `client/src/hooks/useBrandsApi.ts:11`

*literal union type of `source` - a single declaring symbol*

| value | declared at |
|---|---|
| `brands.json` | `client/src/hooks/useBrandsApi.ts:11` |
| `disk` | `client/src/hooks/useBrandsApi.ts:11` |

### `client/src/hooks/useConfigApi.WatcherInfo.status` — `client/src/hooks/useConfigApi.ts:54`

*literal union type of `status` - a single declaring symbol*

| value | declared at |
|---|---|
| `active` | `client/src/hooks/useConfigApi.ts:54` |
| `error` | `client/src/hooks/useConfigApi.ts:54` |

### `client/src/hooks/useMicAnalyser.MicStatus` — `client/src/hooks/useMicAnalyser.ts:54`

*literal union type alias `MicStatus` - a single declaring symbol*

| value | declared at |
|---|---|
| `idle` | `client/src/hooks/useMicAnalyser.ts:54` |
| `starting` | `client/src/hooks/useMicAnalyser.ts:54` |
| `running` | `client/src/hooks/useMicAnalyser.ts:54` |
| `error` | `client/src/hooks/useMicAnalyser.ts:54` |

### `client/src/hooks/useMicAnalyser.MicMode` — `client/src/hooks/useMicAnalyser.ts:61`

DECLARED by the operator, never inferred (spec §3.0). ROOM characterises the background

*literal union type alias `MicMode` - a single declaring symbol*

| value | declared at |
|---|---|
| `room` | `client/src/hooks/useMicAnalyser.ts:61` |
| `speaking` | `client/src/hooks/useMicAnalyser.ts:61` |

### `client/src/hooks/useMicAnalyser.ProbeVerdict` — `client/src/hooks/useMicAnalyser.ts:99`

Gate 3 — the system-processing probe.

*literal union type alias `ProbeVerdict` - a single declaring symbol*

| value | declared at |
|---|---|
| `clean` | `client/src/hooks/useMicAnalyser.ts:99` |
| `suspicious` | `client/src/hooks/useMicAnalyser.ts:99` |
| `inconclusive` | `client/src/hooks/useMicAnalyser.ts:99` |

### `client/src/hooks/useProjectsApi.NextCodeResponse.state` — `client/src/hooks/useProjectsApi.ts:288`

*literal union type of `state` - a single declaring symbol*

| value | declared at |
|---|---|
| `ok` | `client/src/hooks/useProjectsApi.ts:288` |
| `empty` | `client/src/hooks/useProjectsApi.ts:288` |
| `unreadable` | `client/src/hooks/useProjectsApi.ts:288` |
| `exhausted` | `client/src/hooks/useProjectsApi.ts:288` |

### `client/src/hooks/useRecordingsApi.TrashArtifact.kind` — `client/src/hooks/useRecordingsApi.ts:68`

*literal union type of `kind` - a single declaring symbol*

| value | declared at |
|---|---|
| `recording` | `client/src/hooks/useRecordingsApi.ts:68` |
| `transcript` | `client/src/hooks/useRecordingsApi.ts:68` |

### `client/src/hooks/useShiftHover.PreviewContent.type` — `client/src/hooks/useShiftHover.ts:17`

*the `type` discriminator of union type `PreviewContent` - each value declared by a literal type in one variant*

| value | declared at |
|---|---|
| `image` | `client/src/hooks/useShiftHover.ts:4` |
| `text` | `client/src/hooks/useShiftHover.ts:12` |

### `client/src/utils/formatting.TimeFormatStyle` — `client/src/utils/formatting.ts:52`

FR-41: Time format styles

*literal union type alias `TimeFormatStyle` - a single declaring symbol*

| value | declared at |
|---|---|
| `smart` | `client/src/utils/formatting.ts:52` |
| `youtube` | `client/src/utils/formatting.ts:52` |
| `seconds` | `client/src/utils/formatting.ts:52` |

### `client/src/utils/micGrading.Grade` — `client/src/utils/micGrading.ts:22`

*literal union type alias `Grade` - a single declaring symbol*

| value | declared at |
|---|---|
| `green` | `client/src/utils/micGrading.ts:22` |
| `orange` | `client/src/utils/micGrading.ts:22` |
| `red` | `client/src/utils/micGrading.ts:22` |
| `grey` | `client/src/utils/micGrading.ts:22` |

### `client/src/utils/micTrajectory.Direction` — `client/src/utils/micTrajectory.ts:33`

*literal union type alias `Direction` - a single declaring symbol*

| value | declared at |
|---|---|
| `improving` | `client/src/utils/micTrajectory.ts:33` |
| `worsening` | `client/src/utils/micTrajectory.ts:33` |
| `flat` | `client/src/utils/micTrajectory.ts:33` |
| `unknown` | `client/src/utils/micTrajectory.ts:33` |

### `client/src/utils/micZones.ZoneKind` — `client/src/utils/micZones.ts:12`

*literal union type alias `ZoneKind` - a single declaring symbol*

| value | declared at |
|---|---|
| `target` | `client/src/utils/micZones.ts:12` |
| `caution` | `client/src/utils/micZones.ts:12` |
| `danger` | `client/src/utils/micZones.ts:12` |

### `server/src/config/env.envSchema.NODE_ENV` — `server/src/config/env.ts:6`

*`z.enum` `NODE_ENV` - a single declaring symbol*

| value | declared at |
|---|---|
| `development` | `server/src/config/env.ts:6` |
| `production` | `server/src/config/env.ts:6` |
| `test` | `server/src/config/env.ts:6` |

### `server/src/scripts/scanProjects.DiscrepancyType` — `server/src/scripts/scanProjects.ts:30`

*literal union type alias `DiscrepancyType` - a single declaring symbol*

| value | declared at |
|---|---|
| `naming` | `server/src/scripts/scanProjects.ts:30` |
| `structural` | `server/src/scripts/scanProjects.ts:30` |
| `derivative` | `server/src/scripts/scanProjects.ts:30` |
| `state` | `server/src/scripts/scanProjects.ts:30` |

### `server/src/scripts/scanProjects.DiscrepancySeverity` — `server/src/scripts/scanProjects.ts:31`

*literal union type alias `DiscrepancySeverity` - a single declaring symbol*

| value | declared at |
|---|---|
| `error` | `server/src/scripts/scanProjects.ts:31` |
| `warning` | `server/src/scripts/scanProjects.ts:31` |
| `info` | `server/src/scripts/scanProjects.ts:31` |

### `server/src/utils/brands.BrandInfo.source` — `server/src/utils/brands.ts:19`

*literal union type of `source` - a single declaring symbol*

| value | declared at |
|---|---|
| `brands.json` | `server/src/utils/brands.ts:19` |
| `disk` | `server/src/utils/brands.ts:19` |

### `server/src/utils/chapterExtraction.MatchResult.matchType` — `server/src/utils/chapterExtraction.ts:266`

*literal union type of `matchType` - a single declaring symbol*

| value | declared at |
|---|---|
| `exact_phrase` | `server/src/utils/chapterExtraction.ts:266` |
| `partial_words` | `server/src/utils/chapterExtraction.ts:266` |
| `similarity` | `server/src/utils/chapterExtraction.ts:266` |

### `server/src/utils/finalMedia.FinalMediaLocation` — `server/src/utils/finalMedia.ts:16`

*literal union type alias `FinalMediaLocation` - a single declaring symbol*

| value | declared at |
|---|---|
| `final` | `server/src/utils/finalMedia.ts:16` |
| `s3-staging` | `server/src/utils/finalMedia.ts:16` |
| `root` | `server/src/utils/finalMedia.ts:16` |

### `server/src/utils/nextProjectCode.NextCodeResult.state` — `server/src/utils/nextProjectCode.ts:72`

*literal union type of `state` - a single declaring symbol*

| value | declared at |
|---|---|
| `ok` | `server/src/utils/nextProjectCode.ts:72` |
| `empty` | `server/src/utils/nextProjectCode.ts:72` |
| `unreadable` | `server/src/utils/nextProjectCode.ts:72` |
| `exhausted` | `server/src/utils/nextProjectCode.ts:72` |

### `server/src/utils/openContext.ApplyResult.kind` — `server/src/utils/openContext.ts:57-60`

*the `kind` discriminator of union type `ApplyResult` - each value declared by a literal type in one variant*

| value | declared at |
|---|---|
| `applied` | `server/src/utils/openContext.ts:58` |
| `missing` | `server/src/utils/openContext.ts:59` |
| `refused` | `server/src/utils/openContext.ts:60` |

### `server/src/utils/openContext.ApplyResult[kind=refused].status` — `server/src/utils/openContext.ts:60`

*literal union type of `status` - a single declaring symbol*

| value | declared at |
|---|---|
| `400` | `server/src/utils/openContext.ts:60` |
| `404` | `server/src/utils/openContext.ts:60` |
| `409` | `server/src/utils/openContext.ts:60` |
| `503` | `server/src/utils/openContext.ts:60` |

### `server/src/utils/openContext.Resolution.kind` — `server/src/utils/openContext.ts:64-66`

*the `kind` discriminator of union type `Resolution` - each value declared by a literal type in one variant*

| value | declared at |
|---|---|
| `resolved` | `server/src/utils/openContext.ts:65` |
| `refused` | `server/src/utils/openContext.ts:66` |

### `server/src/utils/openContext.Resolution[kind=refused].status` — `server/src/utils/openContext.ts:66`

*literal union type of `status` - a single declaring symbol*

| value | declared at |
|---|---|
| `400` | `server/src/utils/openContext.ts:66` |
| `404` | `server/src/utils/openContext.ts:66` |
| `409` | `server/src/utils/openContext.ts:66` |
| `503` | `server/src/utils/openContext.ts:66` |

### `server/src/utils/recordingArtifacts.ArtifactKind` — `server/src/utils/recordingArtifacts.ts:14`

*literal union type alias `ArtifactKind` - a single declaring symbol*

| value | declared at |
|---|---|
| `recording` | `server/src/utils/recordingArtifacts.ts:14` |
| `transcript` | `server/src/utils/recordingArtifacts.ts:14` |

### `server/src/utils/reporters.Recording.folder` — `server/src/utils/reporters.ts:77`

*literal union type of `folder` - a single declaring symbol*

| value | declared at |
|---|---|
| `recordings` | `server/src/utils/reporters.ts:77` |
| `safe` | `server/src/utils/reporters.ts:77` |

### `server/src/utils/storageTree.HEAVY_SUBFOLDERS` — `server/src/utils/storageTree.ts:23`

*`as const` array `HEAVY_SUBFOLDERS`, typed from by `typeof HEAVY_SUBFOLDERS[number]` - a single declaring symbol*

| value | declared at |
|---|---|
| `recordings` | `server/src/utils/storageTree.ts:23` |
| `hub/recordings` | `server/src/utils/storageTree.ts:23` |
| `recording-shadows` | `server/src/utils/storageTree.ts:23` |
| `final` | `server/src/utils/storageTree.ts:23` |
| `b-roll` | `server/src/utils/storageTree.ts:23` |

### `shared/apiRegistry.HttpMethod` — `shared/apiRegistry.ts:6`

API Registry

*literal union type alias `HttpMethod` - a single declaring symbol*

| value | declared at |
|---|---|
| `GET` | `shared/apiRegistry.ts:6` |
| `POST` | `shared/apiRegistry.ts:6` |
| `PUT` | `shared/apiRegistry.ts:6` |
| `PATCH` | `shared/apiRegistry.ts:6` |
| `DELETE` | `shared/apiRegistry.ts:6` |

### `shared/apiRegistry.ParameterType` — `shared/apiRegistry.ts:7`

*literal union type alias `ParameterType` - a single declaring symbol*

| value | declared at |
|---|---|
| `path` | `shared/apiRegistry.ts:7` |
| `query` | `shared/apiRegistry.ts:7` |
| `body` | `shared/apiRegistry.ts:7` |

### `shared/apiRegistry.DataType` — `shared/apiRegistry.ts:8`

*literal union type alias `DataType` - a single declaring symbol*

| value | declared at |
|---|---|
| `string` | `shared/apiRegistry.ts:8` |
| `number` | `shared/apiRegistry.ts:8` |
| `boolean` | `shared/apiRegistry.ts:8` |
| `object` | `shared/apiRegistry.ts:8` |
| `array` | `shared/apiRegistry.ts:8` |

### `shared/contextSchemas.OpenContextArgSchema` — `shared/contextSchemas.ts:11`

*`z.enum` `OpenContextArgSchema` - a single declaring symbol*

*aliases* `OpenContextArg` `shared/contextSchemas.ts:12`

| value | declared at |
|---|---|
| `brand` | `shared/contextSchemas.ts:11` |
| `project` | `shared/contextSchemas.ts:11` |
| `video` | `shared/contextSchemas.ts:11` |

### `shared/contextSchemas.HubContextSchema.membership` — `shared/contextSchemas.ts:24`

*`z.enum` `membership` - a single declaring symbol*

| value | declared at |
|---|---|
| `member` | `shared/contextSchemas.ts:24` |
| `folder` | `shared/contextSchemas.ts:24` |

### `shared/contextSchemas.ContextRefusalSchema.code` — `shared/contextSchemas.ts:49`

*`z.enum` `code` - members read through `REFUSAL_CODES` (shared/contextSchemas.REFUSAL_CODES) - a single declaring symbol*

| value | declared at |
|---|---|
| `missing` | `shared/contextSchemas.ts:37` |
| `unknown-brand` | `shared/contextSchemas.ts:38` |
| `no-brand-root` | `shared/contextSchemas.ts:39` |
| `registry-unreadable` | `shared/contextSchemas.ts:40` |
| `project-not-found` | `shared/contextSchemas.ts:41` |
| `project-ambiguous` | `shared/contextSchemas.ts:42` |
| `not-a-project` | `shared/contextSchemas.ts:43` |
| `video-invalid` | `shared/contextSchemas.ts:44` |
| `video-not-found` | `shared/contextSchemas.ts:45` |

### `shared/types.MachineRole` — `shared/types.ts:4`

*literal union type alias `MachineRole` - a single declaring symbol*

| value | declared at |
|---|---|
| `recorder` | `shared/types.ts:4` |
| `editor` | `shared/types.ts:4` |

### `shared/types.ProjectAspectValue` — `shared/types.ts:18`

*literal union type alias `ProjectAspectValue` - a single declaring symbol*

| value | declared at |
|---|---|
| `16:9` | `shared/types.ts:18` |
| `9:16` | `shared/types.ts:18` |
| `1:1` | `shared/types.ts:18` |

### `shared/types.AspectCheck.status` — `shared/types.ts:21`

ok · mismatch (shout) · skipped (project has no aspect set) · unknown (could not probe)

*literal union type of `status` - a single declaring symbol*

| value | declared at |
|---|---|
| `ok` | `shared/types.ts:21` |
| `mismatch` | `shared/types.ts:21` |
| `skipped` | `shared/types.ts:21` |
| `unknown` | `shared/types.ts:21` |

### `shared/types.DiskThresholdLevel` — `shared/types.ts:123`

*literal union type alias `DiskThresholdLevel` - a single declaring symbol*

| value | declared at |
|---|---|
| `faint` | `shared/types.ts:123` |
| `amber` | `shared/types.ts:123` |
| `red` | `shared/types.ts:123` |

### `shared/types.HoldLocation` — `shared/types.ts:126`

*literal union type alias `HoldLocation` - a single declaring symbol*

| value | declared at |
|---|---|
| `local-only` | `shared/types.ts:126` |
| `holding-only` | `shared/types.ts:126` |
| `both` | `shared/types.ts:126` |
| `unknown` | `shared/types.ts:126` |

### `shared/types.ArchiveState` — `shared/types.ts:151`

*literal union type alias `ArchiveState` - a single declaring symbol*

| value | declared at |
|---|---|
| `local` | `shared/types.ts:151` |
| `held-local` | `shared/types.ts:151` |
| `held-only` | `shared/types.ts:151` |

### `shared/types.StorageState` — `shared/types.ts:177`

*literal union type alias `StorageState` - a single declaring symbol*

| value | declared at |
|---|---|
| `active` | `shared/types.ts:177` |
| `held` | `shared/types.ts:177` |
| `archived` | `shared/types.ts:177` |

### `shared/types.StorageClassification` — `shared/types.ts:178`

*literal union type alias `StorageClassification` - a single declaring symbol*

| value | declared at |
|---|---|
| `heavy` | `shared/types.ts:178` |
| `light` | `shared/types.ts:178` |

### `shared/types.StorageLocation` — `shared/types.ts:179`

*literal union type alias `StorageLocation` - a single declaring symbol*

| value | declared at |
|---|---|
| `local` | `shared/types.ts:179` |
| `holding` | `shared/types.ts:179` |
| `published` | `shared/types.ts:179` |

### `shared/types.StorageActivityAction` — `shared/types.ts:229`

*literal union type alias `StorageActivityAction` - a single declaring symbol*

| value | declared at |
|---|---|
| `hold` | `shared/types.ts:229` |
| `restore-held` | `shared/types.ts:229` |
| `archive` | `shared/types.ts:229` |
| `unarchive` | `shared/types.ts:229` |
| `held-archive` | `shared/types.ts:229` |

### `shared/types.RenameRequest.destination` — `shared/types.ts:254`

*literal union type of `destination` - a single declaring symbol*

| value | declared at |
|---|---|
| `recordings` | `shared/types.ts:254` |
| `b-roll` | `shared/types.ts:254` |

### `shared/types.ProjectPriority` — `shared/types.ts:291`

*literal union type alias `ProjectPriority` - a single declaring symbol*

| value | declared at |
|---|---|
| `pinned` | `shared/types.ts:291` |
| `normal` | `shared/types.ts:291` |

### `shared/types.ProjectStage` — `shared/types.ts:294-304`

*literal union type alias `ProjectStage` - a single declaring symbol*

| value | declared at |
|---|---|
| `planning` | `shared/types.ts:295` |
| `recording` | `shared/types.ts:296` |
| `first-edit` | `shared/types.ts:297` |
| `second-edit` | `shared/types.ts:298` |
| `review` | `shared/types.ts:299` |
| `ready-to-publish` | `shared/types.ts:300` |
| `published` | `shared/types.ts:301` |
| `archived` | `shared/types.ts:302` |
| `shelved` | `shared/types.ts:303` |
| `remix` | `shared/types.ts:304` |

### `shared/types.TranscriptionStatus` — `shared/types.ts:567`

*literal union type alias `TranscriptionStatus` - a single declaring symbol*

| value | declared at |
|---|---|
| `none` | `shared/types.ts:567` |
| `queued` | `shared/types.ts:567` |
| `transcribing` | `shared/types.ts:567` |
| `complete` | `shared/types.ts:567` |
| `error` | `shared/types.ts:567` |

### `shared/types.FinalMediaLocation` — `shared/types.ts:614`

*literal union type alias `FinalMediaLocation` - a single declaring symbol*

| value | declared at |
|---|---|
| `final` | `shared/types.ts:614` |
| `s3-staging` | `shared/types.ts:614` |
| `root` | `shared/types.ts:614` |

### `shared/types.ChapterMatchStatus` — `shared/types.ts:645`

*literal union type alias `ChapterMatchStatus` - a single declaring symbol*

| value | declared at |
|---|---|
| `matched` | `shared/types.ts:645` |
| `low_confidence` | `shared/types.ts:645` |
| `not_found` | `shared/types.ts:645` |

### `shared/types.ChapterMatchCandidate.matchMethod` — `shared/types.ts:653`

*literal union type of `matchMethod` - a single declaring symbol*

| value | declared at |
|---|---|
| `phrase` | `shared/types.ts:653` |
| `partial` | `shared/types.ts:653` |
| `keyword` | `shared/types.ts:653` |

### `shared/types.ChapterVerifyResponse.recommendation.action` — `shared/types.ts:707`

*literal union type of `action` - a single declaring symbol*

| value | declared at |
|---|---|
| `use_current` | `shared/types.ts:707` |
| `use_alternative` | `shared/types.ts:707` |
| `manual_timestamp` | `shared/types.ts:707` |
| `skip` | `shared/types.ts:707` |

### `shared/types.ChapterOverride.action` — `shared/types.ts:720`

*literal union type of `action` - a single declaring symbol*

| value | declared at |
|---|---|
| `override` | `shared/types.ts:720` |
| `skip` | `shared/types.ts:720` |

### `shared/types.SetChapterOverrideRequest.action` — `shared/types.ts:731`

*literal union type of `action` - a single declaring symbol*

| value | declared at |
|---|---|
| `override` | `shared/types.ts:731` |
| `skip` | `shared/types.ts:731` |

### `shared/types.ChapterRecordingConfig.resolution` — `shared/types.ts:746`

*literal union type of `resolution` - a single declaring symbol*

| value | declared at |
|---|---|
| `720p` | `shared/types.ts:746` |
| `1080p` | `shared/types.ts:746` |

### `shared/types.ChapterGenerationProgress.status` — `shared/types.ts:769`

*literal union type of `status` - a single declaring symbol*

| value | declared at |
|---|---|
| `pending` | `shared/types.ts:769` |
| `generating` | `shared/types.ts:769` |
| `complete` | `shared/types.ts:769` |
| `error` | `shared/types.ts:769` |

### `shared/types.QueueAllResponse.scope` — `shared/types.ts:932`

*literal union type of `scope` - a single declaring symbol*

| value | declared at |
|---|---|
| `project` | `shared/types.ts:932` |
| `chapter` | `shared/types.ts:932` |

### `shared/types.EnvironmentResponse.platform` — `shared/types.ts:988`

*literal union type of `platform` - a single declaring symbol*

| value | declared at |
|---|---|
| `win32` | `shared/types.ts:988` |
| `linux` | `shared/types.ts:988` |
| `darwin` | `shared/types.ts:988` |

### `shared/types.EnvironmentResponse.pathFormat` — `shared/types.ts:990`

*literal union type of `pathFormat` - a single declaring symbol*

| value | declared at |
|---|---|
| `windows` | `shared/types.ts:990` |
| `linux` | `shared/types.ts:990` |

### `shared/types.ProjectShips` — `shared/types.ts:1036`

FR-168: RENDER GRAIN — does this project ship ONE video, or one video per chapter?

*literal union type alias `ProjectShips` - a single declaring symbol*

| value | declared at |
|---|---|
| `per-project` | `shared/types.ts:1036` |
| `per-chapter` | `shared/types.ts:1036` |

### `shared/types.FolderKey` — `shared/types.ts:1087-1105`

*literal union type alias `FolderKey` - a single declaring symbol*

| value | declared at |
|---|---|
| `ecamm` | `shared/types.ts:1088` |
| `downloads` | `shared/types.ts:1089` |
| `recordings` | `shared/types.ts:1090` |
| `safe` | `shared/types.ts:1091` |
| `trash` | `shared/types.ts:1092` |
| `images` | `shared/types.ts:1093` |
| `thumbs` | `shared/types.ts:1094` |
| `transcripts` | `shared/types.ts:1095` |
| `project` | `shared/types.ts:1096` |
| `final` | `shared/types.ts:1097` |
| `s3Staging` | `shared/types.ts:1098` |
| `s3Prep` | `shared/types.ts:1099` |
| `s3Post` | `shared/types.ts:1100` |
| `inbox` | `shared/types.ts:1101` |
| `chapters` | `shared/types.ts:1102` |
| `edit-1st` | `shared/types.ts:1103` |
| `edit-2nd` | `shared/types.ts:1104` |
| `edit-final` | `shared/types.ts:1105` |

### `shared/types.EditFolderKey` — `shared/types.ts:1108`

*literal union type alias `EditFolderKey` - a single declaring symbol*

| value | declared at |
|---|---|
| `edit-1st` | `shared/types.ts:1108` |
| `edit-2nd` | `shared/types.ts:1108` |
| `edit-final` | `shared/types.ts:1108` |

### `shared/types.ManifestFileStatus.status` — `shared/types.ts:1113`

*literal union type of `status` - a single declaring symbol*

| value | declared at |
|---|---|
| `present` | `shared/types.ts:1113` |
| `missing` | `shared/types.ts:1113` |
| `changed` | `shared/types.ts:1113` |

### `shared/types.ManifestStatus` — `shared/types.ts:1119`

*literal union type alias `ManifestStatus` - a single declaring symbol*

| value | declared at |
|---|---|
| `present` | `shared/types.ts:1119` |
| `cleaned` | `shared/types.ts:1119` |
| `changed` | `shared/types.ts:1119` |
| `missing` | `shared/types.ts:1119` |
| `no-manifest` | `shared/types.ts:1119` |

### `shared/types.MicCheckMode` — `shared/types.ts:1195`

One rolling sample, posted ~1 Hz. The worklet emits ~23 Hz; posting at that rate

*literal union type alias `MicCheckMode` - a single declaring symbol*

| value | declared at |
|---|---|
| `room` | `shared/types.ts:1195` |
| `speaking` | `shared/types.ts:1195` |

### `shared/types.MicCheckEventKind` — `shared/types.ts:1225-1230`

*literal union type alias `MicCheckEventKind` - a single declaring symbol*

| value | declared at |
|---|---|
| `level-step` | `shared/types.ts:1226` |
| `clip` | `shared/types.ts:1227` |
| `near-clip-run` | `shared/types.ts:1228` |
| `level-instability` | `shared/types.ts:1229` |
| `room-contaminated` | `shared/types.ts:1230` |

### `shared/types.MicCheckProbeVerdict` — `shared/types.ts:1256`

*literal union type alias `MicCheckProbeVerdict` - a single declaring symbol*

| value | declared at |
|---|---|
| `clean` | `shared/types.ts:1256` |
| `suspicious` | `shared/types.ts:1256` |
| `inconclusive` | `shared/types.ts:1256` |

## Closed sets — derived (no declaring symbol)

Each set below was read out of the real authority — control flow, membership tests, dispatch tables — because nothing declares it. **Correct as of this commit and fragile after it.** Each carries the refactor that would make it declared.

### `client/src/components/ApiExplorer.selectedEndpoint.method (membership)` — `client/src/components/ApiExplorer.tsx:156`

*inline membership test `[...].includes(selectedEndpoint.method)` - no declaring symbol*

| value | read from |
|---|---|
| `POST` | `client/src/components/ApiExplorer.tsx:156` |
| `PUT` | `client/src/components/ApiExplorer.tsx:156` |
| `PATCH` | `client/src/components/ApiExplorer.tsx:156` |

> **REFACTOR: the set for `selectedEndpoint.method` is inlined at client/src/components/ApiExplorer.tsx:156. Name it once (z.enum / literal union) so it has one authority.**

### `client/src/components/AssetsPage.stored (membership)` — `client/src/components/AssetsPage.tsx:206`

*inline membership test `[...].includes(stored)` - no declaring symbol*

| value | read from |
|---|---|
| `S` | `client/src/components/AssetsPage.tsx:206` |
| `M` | `client/src/components/AssetsPage.tsx:206` |
| `L` | `client/src/components/AssetsPage.tsx:206` |
| `XL` | `client/src/components/AssetsPage.tsx:206` |

> **REFACTOR: the set for `stored` is inlined at client/src/components/AssetsPage.tsx:206. Name it once (z.enum / literal union) so it has one authority.**

### `client/src/components/AssetsPage.stored (membership) #2` — `client/src/components/AssetsPage.tsx:214`

*inline membership test `[...].includes(stored)` - no declaring symbol*

| value | read from |
|---|---|
| `S` | `client/src/components/AssetsPage.tsx:214` |
| `M` | `client/src/components/AssetsPage.tsx:214` |
| `L` | `client/src/components/AssetsPage.tsx:214` |
| `XL` | `client/src/components/AssetsPage.tsx:214` |

> **REFACTOR: the set for `stored` is inlined at client/src/components/AssetsPage.tsx:214. Name it once (z.enum / literal union) so it has one authority.**

### `client/src/components/ConfigPanel.preset (branching)` — `client/src/components/ConfigPanel.tsx:842`

*if/else-if chain on `preset` - its type is not a literal union, no enum, no z.enum*

| value | read from |
|---|---|
| `all` | `client/src/components/ConfigPanel.tsx:842` |
| `early` | `client/src/components/ConfigPanel.tsx:844` |
| `late` | `client/src/components/ConfigPanel.tsx:845` |
| `custom` | `client/src/components/ConfigPanel.tsx:846` |

> **REFACTOR: `preset` is a closed set enforced only by control flow at client/src/components/ConfigPanel.tsx:842. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.**

### `client/src/components/InboxPage.VIEWABLE_EXTENSIONS` — `client/src/components/InboxPage.tsx:19-30`

*module constant `VIEWABLE_EXTENSIONS` used in a `.includes()` test - one place to change, but no z.enum or literal union, so nothing checks a value against it*

| value | read from |
|---|---|
| `.md` | `client/src/components/InboxPage.tsx:20` |
| `.json` | `client/src/components/InboxPage.tsx:21` |
| `.html` | `client/src/components/InboxPage.tsx:22` |
| `.txt` | `client/src/components/InboxPage.tsx:23` |
| `.css` | `client/src/components/InboxPage.tsx:24` |
| `.js` | `client/src/components/InboxPage.tsx:25` |
| `.ts` | `client/src/components/InboxPage.tsx:26` |
| `.yaml` | `client/src/components/InboxPage.tsx:27` |
| `.yml` | `client/src/components/InboxPage.tsx:28` |
| `.xml` | `client/src/components/InboxPage.tsx:29` |

> **REFACTOR (minor): `VIEWABLE_EXTENSIONS` at client/src/components/InboxPage.tsx:19 names the set but does not type it. A z.enum or `as const` + `typeof VIEWABLE_EXTENSIONS[number]` would make a wrong value a static error rather than a runtime miss.**

### `client/src/components/TranscriptionsPage.status (switch)` — `client/src/components/TranscriptionsPage.tsx:254`

*`switch` on `status` - its type is not a literal union, no enum, no z.enum*

| value | read from |
|---|---|
| `complete` | `client/src/components/TranscriptionsPage.tsx:255` |
| `error` | `client/src/components/TranscriptionsPage.tsx:257` |

> **REFACTOR: `status` is a closed set enforced only by control flow at client/src/components/TranscriptionsPage.tsx:254. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.**

### `client/src/utils/projectFilters.activePreset (branching)` — `client/src/utils/projectFilters.ts:39`

*if/else-if chain on `activePreset` - its type is not a literal union, no enum, no z.enum*

| value | read from |
|---|---|
| `needs-attention` | `client/src/utils/projectFilters.ts:39` |
| `dead` | `client/src/utils/projectFilters.ts:41` |
| `ready-to-edit` | `client/src/utils/projectFilters.ts:46` |
| `ready-to-launch-optimise` | `client/src/utils/projectFilters.ts:50` |

> **REFACTOR: `activePreset` is a closed set enforced only by control flow at client/src/utils/projectFilters.ts:39. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.**

### `server/src/routes/assets.IMAGE_EXTENSIONS` — `server/src/routes/assets.ts:30`

*module constant `IMAGE_EXTENSIONS` used in a `.includes()` test - one place to change, but no z.enum or literal union, so nothing checks a value against it*

| value | read from |
|---|---|
| `.png` | `server/src/routes/assets.ts:30` |
| `.jpg` | `server/src/routes/assets.ts:30` |
| `.jpeg` | `server/src/routes/assets.ts:30` |
| `.webp` | `server/src/routes/assets.ts:30` |

> **REFACTOR (minor): `IMAGE_EXTENSIONS` at server/src/routes/assets.ts:30 names the set but does not type it. A z.enum or `as const` + `typeof IMAGE_EXTENSIONS[number]` would make a wrong value a static error rather than a runtime miss.**

### `server/src/routes/projects.priority (membership)` — `server/src/routes/projects.ts:148`

*inline membership test `[...].includes(priority)` - no declaring symbol*

| value | read from |
|---|---|
| `pinned` | `server/src/routes/projects.ts:148` |
| `normal` | `server/src/routes/projects.ts:148` |

> **REFACTOR: the set for `priority` is inlined at server/src/routes/projects.ts:148. Name it once (z.enum / literal union) so it has one authority.**

### `server/src/routes/thumbs.IMAGE_EXTENSIONS` — `server/src/routes/thumbs.ts:11`

*module constant `IMAGE_EXTENSIONS` used in a `.includes()` test - one place to change, but no z.enum or literal union, so nothing checks a value against it*

| value | read from |
|---|---|
| `.png` | `server/src/routes/thumbs.ts:11` |
| `.jpg` | `server/src/routes/thumbs.ts:11` |
| `.jpeg` | `server/src/routes/thumbs.ts:11` |
| `.webp` | `server/src/routes/thumbs.ts:11` |

> **REFACTOR (minor): `IMAGE_EXTENSIONS` at server/src/routes/thumbs.ts:11 names the set but does not type it. A z.enum or `as const` + `typeof IMAGE_EXTENSIONS[number]` would make a wrong value a static error rather than a runtime miss.**

### `server/src/routes/transcriptions.scope (membership)` — `server/src/routes/transcriptions.ts:637`

*inline membership test `[...].includes(scope)` - no declaring symbol*

| value | read from |
|---|---|
| `project` | `server/src/routes/transcriptions.ts:637` |
| `chapter` | `server/src/routes/transcriptions.ts:637` |

> **REFACTOR: the set for `scope` is inlined at server/src/routes/transcriptions.ts:637. Name it once (z.enum / literal union) so it has one authority.**

### `server/src/routes/video.folder (branching)` — `server/src/routes/video.ts:81`

*if/else-if chain on `folder` - its type is not a literal union, no enum, no z.enum*

| value | read from |
|---|---|
| `-chapters` | `server/src/routes/video.ts:81` |
| `recordings` | `server/src/routes/video.ts:83` |

> **REFACTOR: `folder` is a closed set enforced only by control flow at server/src/routes/video.ts:81. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.**

### `server/src/routes/video.ext (membership)` — `server/src/routes/video.ts:161`

*inline membership test `[...].includes(ext)` - no declaring symbol*

| value | read from |
|---|---|
| `.mov` | `server/src/routes/video.ts:161` |
| `.mp4` | `server/src/routes/video.ts:161` |

> **REFACTOR: the set for `ext` is inlined at server/src/routes/video.ts:161. Name it once (z.enum / literal union) so it has one authority.**

### `server/src/routes/video.ext (membership) #2` — `server/src/routes/video.ts:242`

*inline membership test `[...].includes(ext)` - no declaring symbol*

| value | read from |
|---|---|
| `.mov` | `server/src/routes/video.ts:242` |
| `.mp4` | `server/src/routes/video.ts:242` |

> **REFACTOR: the set for `ext` is inlined at server/src/routes/video.ts:242. Name it once (z.enum / literal union) so it has one authority.**

### `server/src/utils/chapterExtraction.word.toLowerCase() (membership)` — `server/src/utils/chapterExtraction.ts:208`

*inline membership test `[...].includes(word.toLowerCase())` - no declaring symbol*

| value | read from |
|---|---|
| `bmad` | `server/src/utils/chapterExtraction.ts:208` |
| `sdk` | `server/src/utils/chapterExtraction.ts:208` |
| `api` | `server/src/utils/chapterExtraction.ts:208` |
| `ai` | `server/src/utils/chapterExtraction.ts:208` |
| `prd` | `server/src/utils/chapterExtraction.ts:208` |
| `pm` | `server/src/utils/chapterExtraction.ts:208` |
| `ui` | `server/src/utils/chapterExtraction.ts:208` |
| `ux` | `server/src/utils/chapterExtraction.ts:208` |

> **REFACTOR: the set for `word.toLowerCase()` is inlined at server/src/utils/chapterExtraction.ts:208. Name it once (z.enum / literal union) so it has one authority.**

### `server/src/utils/loopback.LOOPBACK_HOSTS` — `server/src/utils/loopback.ts:13`

*module constant `LOOPBACK_HOSTS` used in a `.has()` test - one place to change, but no z.enum or literal union, so nothing checks a value against it*

| value | read from |
|---|---|
| `localhost` | `server/src/utils/loopback.ts:13` |
| `127.0.0.1` | `server/src/utils/loopback.ts:13` |
| `[::1]` | `server/src/utils/loopback.ts:13` |
| `::1` | `server/src/utils/loopback.ts:13` |

> **REFACTOR (minor): `LOOPBACK_HOSTS` at server/src/utils/loopback.ts:13 names the set but does not type it. A z.enum or `as const` + `typeof LOOPBACK_HOSTS[number]` would make a wrong value a static error rather than a runtime miss.**

> 4 comparison(s) against vocabularies this app does not own (DOM key names, HTTP headers, library internals) were **not** treated as closed sets and carry no refactor advice: `client/src/components/shared/BatchToolbar.e.key (branching)` (the subject is a property declared by TypeScript's lib or a package), `client/src/components/shared/EditableFileRow.e.key (branching)` (the subject is a property declared by TypeScript's lib or a package), `server/src/routes/projects.parts.length (branching)` (the subject is a property declared by TypeScript's lib or a package), `server/src/utils/llmVerification.parts.length (branching)` (the subject is a property declared by TypeScript's lib or a package).

## Shapes

### `client/src/App.NamingState` — interface — `client/src/App.tsx:97-103`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `client/src/App.tsx:98` |
| `sequence` | `string` | — | `client/src/App.tsx:99` |
| `name` | `string` | — | `client/src/App.tsx:100` |
| `tags` | `string[]` | — | `client/src/App.tsx:101` |
| `customTag` | `string` | — | `client/src/App.tsx:102` |

### `client/src/components/ApiExplorer.ParamValues` — interface — `client/src/components/ApiExplorer.tsx:14-17`

| field | type | default | at |
|---|---|---|---|
| `[key: string]` | `any` | — | `client/src/components/ApiExplorer.tsx:16` |

### `client/src/components/ApiExplorer.ApiResponse` — interface — `client/src/components/ApiExplorer.tsx:19-25`

| field | type | default | at |
|---|---|---|---|
| `status` | `number` | — | `client/src/components/ApiExplorer.tsx:20` |
| `statusText` | `string` | — | `client/src/components/ApiExplorer.tsx:21` |
| `data` | `any` | — | `client/src/components/ApiExplorer.tsx:23` |
| `error` | `?: string` | — | `client/src/components/ApiExplorer.tsx:24` |

### `client/src/components/ApiExplorer.ApiExplorerProps` — interface — `client/src/components/ApiExplorer.tsx:27-29`

| field | type | default | at |
|---|---|---|---|
| `currentProject` | `?: string` | — | `client/src/components/ApiExplorer.tsx:28` |

### `client/src/components/AssetsPage.PairedAsset` — interface — `client/src/components/AssetsPage.tsx:32-42`

| field | type | default | at |
|---|---|---|---|
| `baseFilename` | `string` | — | `client/src/components/AssetsPage.tsx:33` |
| `image` | `ImageAsset \| null → shared/types.ImageAsset` | — | `client/src/components/AssetsPage.tsx:34` |
| `prompt` | `PromptAsset \| null → shared/types.PromptAsset` | — | `client/src/components/AssetsPage.tsx:35` |
| `chapter` | `string` | — | `client/src/components/AssetsPage.tsx:37` |
| `sequence` | `string` | — | `client/src/components/AssetsPage.tsx:38` |
| `imageOrder` | `string` | — | `client/src/components/AssetsPage.tsx:39` |
| `variant` | `string \| null` | — | `client/src/components/AssetsPage.tsx:40` |
| `label` | `string` | — | `client/src/components/AssetsPage.tsx:41` |

### `client/src/components/AssetsPage.AssignmentState` — interface — `client/src/components/AssetsPage.tsx:77-82`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `client/src/components/AssetsPage.tsx:78` |
| `sequence` | `string` | — | `client/src/components/AssetsPage.tsx:79` |
| `variant` | `VariantOption → client/src/components/AssetsPage.VariantOption` | — | `client/src/components/AssetsPage.tsx:80` |
| `label` | `string` | — | `client/src/components/AssetsPage.tsx:81` |

### `client/src/components/AssetsPage.ImageCardProps` — interface — `client/src/components/AssetsPage.tsx:1362-1377`

| field | type | default | at |
|---|---|---|---|
| `image` | `ImageInfo → shared/types.ImageInfo` | — | `client/src/components/AssetsPage.tsx:1363` |
| `onAssign` | `() => void` | — | `client/src/components/AssetsPage.tsx:1364` |
| `onDelete` | `() => void` | — | `client/src/components/AssetsPage.tsx:1365` |
| `isAssigning` | `boolean` | — | `client/src/components/AssetsPage.tsx:1366` |
| `isDeleting` | `boolean` | — | `client/src/components/AssetsPage.tsx:1367` |
| `canAssign` | `boolean` | — | `client/src/components/AssetsPage.tsx:1368` |
| `shiftHeld` | `boolean` | — | `client/src/components/AssetsPage.tsx:1369` |
| `onPreviewEnter` | `(image: { url: string; filename: string; size: number; timestamp: string }, e: React.MouseEvent) => void → React (@types/react), MouseEvent (@types/react)` | — | `client/src/components/AssetsPage.tsx:1370` |
| `onPreviewMove` | `(e: React.MouseEvent) => void → React (@types/react), MouseEvent (@types/react)` | — | `client/src/components/AssetsPage.tsx:1374` |
| `onPreviewLeave` | `() => void` | — | `client/src/components/AssetsPage.tsx:1375` |
| `thumbnailSize` | `ThumbnailSize → client/src/components/AssetsPage.ThumbnailSize` | — | `client/src/components/AssetsPage.tsx:1376` |

### `client/src/components/ChapterContextPanel.ChapterContextPanelProps` — interface — `client/src/components/ChapterContextPanel.tsx:6-8`

| field | type | default | at |
|---|---|---|---|
| `recordings` | `RecordingFile[] → shared/types.RecordingFile` | — | `client/src/components/ChapterContextPanel.tsx:7` |

### `client/src/components/ChapterContextPanel.ChapterSummary` — interface — `client/src/components/ChapterContextPanel.tsx:10-13`

| field | type | default | at |
|---|---|---|---|
| `number` | `string` | — | `client/src/components/ChapterContextPanel.tsx:11` |
| `name` | `string` | — | `client/src/components/ChapterContextPanel.tsx:12` |

### `client/src/components/ChapterHelpPanel.HelpSectionProps` — interface — `client/src/components/ChapterHelpPanel.tsx:166-171`

| field | type | default | at |
|---|---|---|---|
| `title` | `string` | — | `client/src/components/ChapterHelpPanel.tsx:167` |
| `expanded` | `boolean` | — | `client/src/components/ChapterHelpPanel.tsx:168` |
| `onToggle` | `() => void` | — | `client/src/components/ChapterHelpPanel.tsx:169` |
| `children` | `React.ReactNode → React (@types/react), ReactNode (@types/react)` | — | `client/src/components/ChapterHelpPanel.tsx:170` |

### `client/src/components/ChapterPanel.ChapterInfo` — interface — `client/src/components/ChapterPanel.tsx:6-12`

| field | type | default | at |
|---|---|---|---|
| `chapterKey` | `string` | — | `client/src/components/ChapterPanel.tsx:7` |
| `name` | `string` | — | `client/src/components/ChapterPanel.tsx:8` |
| `title` | `?: string` | — | `client/src/components/ChapterPanel.tsx:9` |
| `startTime` | `number` | — | `client/src/components/ChapterPanel.tsx:10` |
| `fileCount` | `number` | — | `client/src/components/ChapterPanel.tsx:11` |

### `client/src/components/ChapterPanel.ChapterPanelProps` — interface — `client/src/components/ChapterPanel.tsx:14-18`

| field | type | default | at |
|---|---|---|---|
| `chapters` | `ChapterInfo[] → client/src/components/ChapterPanel.ChapterInfo` | — | `client/src/components/ChapterPanel.tsx:15` |
| `currentChapter` | `string \| null` | — | `client/src/components/ChapterPanel.tsx:16` |
| `onChapterClick` | `(chapterKey: string) => void` | — | `client/src/components/ChapterPanel.tsx:17` |

### `client/src/components/ClipboardPasteModal.ClipboardPasteModalProps` — interface — `client/src/components/ClipboardPasteModal.tsx:4-12`

| field | type | default | at |
|---|---|---|---|
| `imageData` | `string` | — | `client/src/components/ClipboardPasteModal.tsx:5` |
| `previewFilename` | `string` | — | `client/src/components/ClipboardPasteModal.tsx:6` |
| `onAssign` | `() => void` | — | `client/src/components/ClipboardPasteModal.tsx:7` |
| `onSaveToIncoming` | `() => void` | — | `client/src/components/ClipboardPasteModal.tsx:8` |
| `onCancel` | `() => void` | — | `client/src/components/ClipboardPasteModal.tsx:9` |
| `isAssigning` | `boolean` | — | `client/src/components/ClipboardPasteModal.tsx:10` |
| `isSavingToIncoming` | `boolean` | — | `client/src/components/ClipboardPasteModal.tsx:11` |

### `client/src/components/ConfigPanel.ConfigPanelProps` — interface — `client/src/components/ConfigPanel.tsx:250-253`

| field | type | default | at |
|---|---|---|---|
| `focusSection` | `?: ConfigFocusSection → client/src/App.ConfigFocusSection` | — | `client/src/components/ConfigPanel.tsx:251` |
| `onFocusSectionHandled` | `?: () => void` | — | `client/src/components/ConfigPanel.tsx:252` |

### `client/src/components/ConnectionIndicator.ConnectionIndicatorProps` — interface — `client/src/components/ConnectionIndicator.tsx:5-8`

| field | type | default | at |
|---|---|---|---|
| `isConnected` | `boolean` | — | `client/src/components/ConnectionIndicator.tsx:6` |
| `isReconnecting` | `boolean` | — | `client/src/components/ConnectionIndicator.tsx:7` |

### `client/src/components/ContextRefusedBanner.ContextRefusedBannerProps` — interface — `client/src/components/ContextRefusedBanner.tsx:5-8`

| field | type | default | at |
|---|---|---|---|
| `refused` | `ContextRefusal → shared/contextSchemas.ContextRefusal` | — | `client/src/components/ContextRefusedBanner.tsx:6` |
| `onDismiss` | `() => void` | — | `client/src/components/ContextRefusedBanner.tsx:7` |

### `client/src/components/DeveloperDrawer.DeveloperDrawerProps` — interface — `client/src/components/DeveloperDrawer.tsx:29-32`

| field | type | default | at |
|---|---|---|---|
| `isOpen` | `boolean` | — | `client/src/components/DeveloperDrawer.tsx:30` |
| `onClose` | `() => void` | — | `client/src/components/DeveloperDrawer.tsx:31` |

### `client/src/components/DiscardModal.DiscardModalProps` — interface — `client/src/components/DiscardModal.tsx:1-5`

| field | type | default | at |
|---|---|---|---|
| `remainingCount` | `number` | — | `client/src/components/DiscardModal.tsx:2` |
| `onConfirm` | `() => void` | — | `client/src/components/DiscardModal.tsx:3` |
| `onCancel` | `() => void` | — | `client/src/components/DiscardModal.tsx:4` |

### `client/src/components/FileCard.FileCardProps` — interface — `client/src/components/FileCard.tsx:10-16`

| field | type | default | at |
|---|---|---|---|
| `file` | `FileInfo → shared/types.FileInfo` | — | `client/src/components/FileCard.tsx:11` |
| `namingState` | `NamingState → client/src/App.NamingState` | — | `client/src/components/FileCard.tsx:12` |
| `onRenamed` | `() => void` | — | `client/src/components/FileCard.tsx:13` |
| `onDiscarded` | `() => void` | — | `client/src/components/FileCard.tsx:14` |
| `takeRank` | `?: 'best' \| 'good' \| null` | — | `client/src/components/FileCard.tsx:15` |

### `client/src/components/HeaderDropdown.DropdownItem` — interface — `client/src/components/HeaderDropdown.tsx:6-11`

| field | type | default | at |
|---|---|---|---|
| `label` | `string` | — | `client/src/components/HeaderDropdown.tsx:7` |
| `icon` | `ReactNode → ReactNode (react)` | — | `client/src/components/HeaderDropdown.tsx:8` |
| `onClick` | `() => void` | — | `client/src/components/HeaderDropdown.tsx:9` |
| `dividerBefore` | `?: boolean` | — | `client/src/components/HeaderDropdown.tsx:10` |

### `client/src/components/HeaderDropdown.HeaderDropdownProps` — interface — `client/src/components/HeaderDropdown.tsx:13-17`

| field | type | default | at |
|---|---|---|---|
| `trigger` | `ReactNode → ReactNode (react)` | — | `client/src/components/HeaderDropdown.tsx:14` |
| `items` | `DropdownItem[] → client/src/components/HeaderDropdown.DropdownItem` | — | `client/src/components/HeaderDropdown.tsx:15` |
| `align` | `?: 'left' \| 'right'` | — | `client/src/components/HeaderDropdown.tsx:16` |

### `client/src/components/HoldDeleteModal.HoldDeleteModalProps` — interface — `client/src/components/HoldDeleteModal.tsx:9-21`

| field | type | default | at |
|---|---|---|---|
| `isOpen` | `boolean` | — | `client/src/components/HoldDeleteModal.tsx:10` |
| `onClose` | `() => void` | — | `client/src/components/HoldDeleteModal.tsx:11` |
| `onConfirm` | `() => void` | — | `client/src/components/HoldDeleteModal.tsx:12` |
| `target` | `'local' \| 'holding'` | — | `client/src/components/HoldDeleteModal.tsx:13` |
| `projectCode` | `string` | — | `client/src/components/HoldDeleteModal.tsx:14` |
| `folderName` | `string` | — | `client/src/components/HoldDeleteModal.tsx:15` |
| `bytesFreed` | `number` | — | `client/src/components/HoldDeleteModal.tsx:16` |
| `targetPath` | `string` | — | `client/src/components/HoldDeleteModal.tsx:17` |
| `verification` | `HoldVerification \| null → shared/types.HoldVerification` | — | `client/src/components/HoldDeleteModal.tsx:18` |
| `isLoading` | `?: boolean` | — | `client/src/components/HoldDeleteModal.tsx:19` |
| `errorMessage` | `?: string \| null` | — | `client/src/components/HoldDeleteModal.tsx:20` |

### `client/src/components/ImagePreviewOverlay.LegacyPreviewImage` — interface — `client/src/components/ImagePreviewOverlay.tsx:6-11`

| field | type | default | at |
|---|---|---|---|
| `url` | `string` | — | `client/src/components/ImagePreviewOverlay.tsx:7` |
| `filename` | `string` | — | `client/src/components/ImagePreviewOverlay.tsx:8` |
| `size` | `number` | — | `client/src/components/ImagePreviewOverlay.tsx:9` |
| `timestamp` | `string` | — | `client/src/components/ImagePreviewOverlay.tsx:10` |

### `client/src/components/ImagePreviewOverlay.ImagePreviewOverlayProps` — interface — `client/src/components/ImagePreviewOverlay.tsx:13-17`

| field | type | default | at |
|---|---|---|---|
| `image` | `?: LegacyPreviewImage \| null → client/src/components/ImagePreviewOverlay.LegacyPreviewImage` | — | `client/src/components/ImagePreviewOverlay.tsx:14` |
| `content` | `?: PreviewContent → client/src/hooks/useShiftHover.PreviewContent` | — | `client/src/components/ImagePreviewOverlay.tsx:15` |
| `position` | `{ x: number; y: number }` | — | `client/src/components/ImagePreviewOverlay.tsx:16` |

### `client/src/components/ImagePreviewOverlay.ImagePreviewOverlayProps.position` — type — `client/src/components/ImagePreviewOverlay.tsx:16`

| field | type | default | at |
|---|---|---|---|
| `x` | `number` | — | `client/src/components/ImagePreviewOverlay.tsx:16` |
| `y` | `number` | — | `client/src/components/ImagePreviewOverlay.tsx:16` |

### `client/src/components/InboxPage.SelectedFile` — interface — `client/src/components/InboxPage.tsx:55-58`

| field | type | default | at |
|---|---|---|---|
| `subfolder` | `string` | — | `client/src/components/InboxPage.tsx:56` |
| `filename` | `string` | — | `client/src/components/InboxPage.tsx:57` |

### `client/src/components/IncomingVideoModal.IncomingVideoModalProps` — interface — `client/src/components/IncomingVideoModal.tsx:12-15`

| field | type | default | at |
|---|---|---|---|
| `file` | `FileInfo → shared/types.FileInfo` | — | `client/src/components/IncomingVideoModal.tsx:13` |
| `onClose` | `() => void` | — | `client/src/components/IncomingVideoModal.tsx:14` |

### `client/src/components/ManagePanel.ChapterGroup` — interface — `client/src/components/ManagePanel.tsx:33-38`

| field | type | default | at |
|---|---|---|---|
| `chapterKey` | `string` | — | `client/src/components/ManagePanel.tsx:34` |
| `title` | `string` | — | `client/src/components/ManagePanel.tsx:35` |
| `files` | `RecordingFile[] → shared/types.RecordingFile` | — | `client/src/components/ManagePanel.tsx:36` |
| `totalSize` | `number` | — | `client/src/components/ManagePanel.tsx:37` |

### `client/src/components/ManagePanel.ManagePanelProps` — interface — `client/src/components/ManagePanel.tsx:89-92`

| field | type | default | at |
|---|---|---|---|
| `initialTool` | `?: string \| null` | — | `client/src/components/ManagePanel.tsx:90` |
| `onToolActivated` | `?: () => void` | — | `client/src/components/ManagePanel.tsx:91` |

### `client/src/components/MicCheckSnapshot.VerdictRowData` — interface — `client/src/components/MicCheckSnapshot.tsx:41-46`

| field | type | default | at |
|---|---|---|---|
| `key` | `string` | — | `client/src/components/MicCheckSnapshot.tsx:42` |
| `label` | `string` | — | `client/src/components/MicCheckSnapshot.tsx:43` |
| `reading` | `Reading → client/src/utils/micGrading.Reading` | — | `client/src/components/MicCheckSnapshot.tsx:44` |
| `track` | `TrackSpec → client/src/utils/micZones.TrackSpec` | — | `client/src/components/MicCheckSnapshot.tsx:45` |

### `client/src/components/NamingControls.NamingControlsProps` — interface — `client/src/components/NamingControls.tsx:29-37`

| field | type | default | at |
|---|---|---|---|
| `namingState` | `NamingState → client/src/App.NamingState` | — | `client/src/components/NamingControls.tsx:30` |
| `updateNaming` | `(field: keyof NamingState, value: string \| string[]) => void → client/src/App.NamingState` | — | `client/src/components/NamingControls.tsx:31` |
| `onNewChapter` | `() => void` | — | `client/src/components/NamingControls.tsx:32` |
| `availableTags` | `?: string[]` | — | `client/src/components/NamingControls.tsx:33` |
| `commonNames` | `?: CommonName[] → shared/types.CommonName` | — | `client/src/components/NamingControls.tsx:34` |
| `newChapterClickCount` | `?: number` | — | `client/src/components/NamingControls.tsx:35` |
| `onAddCommonName` | `?: () => void` | — | `client/src/components/NamingControls.tsx:36` |

### `client/src/components/NewProjectForm.NewProjectFormProps` — interface — `client/src/components/NewProjectForm.tsx:15-20`

| field | type | default | at |
|---|---|---|---|
| `existingNames` | `string[]` | — | `client/src/components/NewProjectForm.tsx:16` |
| `pending` | `boolean` | — | `client/src/components/NewProjectForm.tsx:17` |
| `onCreate` | `(fullName: string, ships: ProjectShips) => void → shared/types.ProjectShips` | — | `client/src/components/NewProjectForm.tsx:18` |
| `onCancel` | `() => void` | — | `client/src/components/NewProjectForm.tsx:19` |

### `client/src/components/ProjectDeleteModal.ProjectDeleteModalProps` — interface — `client/src/components/ProjectDeleteModal.tsx:8-16`

| field | type | default | at |
|---|---|---|---|
| `isOpen` | `boolean` | — | `client/src/components/ProjectDeleteModal.tsx:9` |
| `onClose` | `() => void` | — | `client/src/components/ProjectDeleteModal.tsx:10` |
| `onConfirm` | `(confirmationCode: string) => void` | — | `client/src/components/ProjectDeleteModal.tsx:11` |
| `project` | `ProjectStats → shared/types.ProjectStats` | — | `client/src/components/ProjectDeleteModal.tsx:12` |
| `diskBytes` | `?: number` | — | `client/src/components/ProjectDeleteModal.tsx:13` |
| `isLoading` | `?: boolean` | — | `client/src/components/ProjectDeleteModal.tsx:14` |
| `errorMessage` | `?: string \| null` | — | `client/src/components/ProjectDeleteModal.tsx:15` |

### `client/src/components/ProjectDrawer.ProjectDrawerProps` — interface — `client/src/components/ProjectDrawer.tsx:38-41`

| field | type | default | at |
|---|---|---|---|
| `project` | `ProjectStats \| null → shared/types.ProjectStats` | — | `client/src/components/ProjectDrawer.tsx:39` |
| `onClose` | `() => void` | — | `client/src/components/ProjectDrawer.tsx:40` |

### `client/src/components/ProjectListToolbar.ProjectListToolbarProps` — interface — `client/src/components/ProjectListToolbar.tsx:32-45`

| field | type | default | at |
|---|---|---|---|
| `totalCount` | `number` | — | `client/src/components/ProjectListToolbar.tsx:33` |
| `filteredCount` | `number` | — | `client/src/components/ProjectListToolbar.tsx:34` |
| `searchQuery` | `string` | — | `client/src/components/ProjectListToolbar.tsx:35` |
| `onSearchChange` | `(query: string) => void` | — | `client/src/components/ProjectListToolbar.tsx:36` |
| `activeStages` | `Set<string>` | — | `client/src/components/ProjectListToolbar.tsx:37` |
| `onStageToggle` | `(stage: string) => void` | — | `client/src/components/ProjectListToolbar.tsx:38` |
| `activePreset` | `string` | — | `client/src/components/ProjectListToolbar.tsx:39` |
| `onPresetChange` | `(preset: string) => void` | — | `client/src/components/ProjectListToolbar.tsx:40` |
| `diskColumnsEnabled` | `?: boolean` | — | `client/src/components/ProjectListToolbar.tsx:42` |
| `onDiskToggle` | `?: () => void` | — | `client/src/components/ProjectListToolbar.tsx:43` |
| `diskScanPending` | `?: boolean` | — | `client/src/components/ProjectListToolbar.tsx:44` |

### `client/src/components/ProjectStatsPopup.Props` — interface — `client/src/components/ProjectStatsPopup.tsx:17-20`

| field | type | default | at |
|---|---|---|---|
| `project` | `ProjectStats → shared/types.ProjectStats` | — | `client/src/components/ProjectStatsPopup.tsx:18` |
| `onClose` | `() => void` | — | `client/src/components/ProjectStatsPopup.tsx:19` |

### `client/src/components/ProjectsPanel.ProjectsPanelProps` — interface — `client/src/components/ProjectsPanel.tsx:36-42`

| field | type | default | at |
|---|---|---|---|
| `onNavigateToTab` | `?: (tab: any) => void` | — | `client/src/components/ProjectsPanel.tsx:38` |
| `onNavigateToStorage` | `?: (projectCode: string) => void` | — | `client/src/components/ProjectsPanel.tsx:41` |

### `client/src/components/RecentlyNamedStrip.RecentlyNamedStripProps` — interface — `client/src/components/RecentlyNamedStrip.tsx:13-18`

| field | type | default | at |
|---|---|---|---|
| `renames` | `RecentRename[] → shared/types.RecentRename` | — | `client/src/components/RecentlyNamedStrip.tsx:14` |
| `projectCode` | `string` | — | `client/src/components/RecentlyNamedStrip.tsx:15` |
| `onUndo` | `(id: string) => void` | — | `client/src/components/RecentlyNamedStrip.tsx:16` |
| `undoPending` | `boolean` | — | `client/src/components/RecentlyNamedStrip.tsx:17` |

### `client/src/components/RecordingVideoModal.RecordingVideoModalProps` — interface — `client/src/components/RecordingVideoModal.tsx:11-22`

| field | type | default | at | note |
|---|---|---|---|---|
| `filename` | `string` | — | `client/src/components/RecordingVideoModal.tsx:12` |  |
| `duration` | `?: number` | — | `client/src/components/RecordingVideoModal.tsx:13` |  |
| `size` | `?: number` | — | `client/src/components/RecordingVideoModal.tsx:14` |  |
| `onClose` | `() => void` | — | `client/src/components/RecordingVideoModal.tsx:15` |  |
| `onPrevious` | `?: () => void` | — | `client/src/components/RecordingVideoModal.tsx:17` | B069: Navigate to previous recording |
| `onNext` | `?: () => void` | — | `client/src/components/RecordingVideoModal.tsx:19` | B069: Navigate to next recording |
| `position` | `?: { current: number; total: number }` | — | `client/src/components/RecordingVideoModal.tsx:21` | B069: Current position in the list |

### `client/src/components/RecordingVideoModal.RecordingVideoModalProps.position` — type — `client/src/components/RecordingVideoModal.tsx:21`

| field | type | default | at |
|---|---|---|---|
| `current` | `number` | — | `client/src/components/RecordingVideoModal.tsx:21` |
| `total` | `number` | — | `client/src/components/RecordingVideoModal.tsx:21` |

### `client/src/components/RecordingsView.ChapterGroup` — interface — `client/src/components/RecordingsView.tsx:49-55`

| field | type | default | at |
|---|---|---|---|
| `files` | `RecordingFile[] → shared/types.RecordingFile` | — | `client/src/components/RecordingsView.tsx:50` |
| `activeCount` | `number` | — | `client/src/components/RecordingsView.tsx:51` |
| `safeCount` | `number` | — | `client/src/components/RecordingsView.tsx:52` |
| `parkedCount` | `number` | — | `client/src/components/RecordingsView.tsx:53` |
| `totalDuration` | `number` | — | `client/src/components/RecordingsView.tsx:54` |

### `client/src/components/RecordingsView.ChapterGroupWithTiming` — interface — `client/src/components/RecordingsView.tsx:58-61`

*extends* `ChapterGroup`

| field | type | default | at |
|---|---|---|---|
| `chapterKey` | `string` | — | `client/src/components/RecordingsView.tsx:59` |
| `startTime` | `number` | — | `client/src/components/RecordingsView.tsx:60` |

### `client/src/components/ThumbsPage.PreviewData` — interface — `client/src/components/ThumbsPage.tsx:34-39`

| field | type | default | at |
|---|---|---|---|
| `src` | `string` | — | `client/src/components/ThumbsPage.tsx:35` |
| `name` | `string` | — | `client/src/components/ThumbsPage.tsx:36` |
| `x` | `number` | — | `client/src/components/ThumbsPage.tsx:37` |
| `y` | `number` | — | `client/src/components/ThumbsPage.tsx:38` |

### `client/src/components/TranscriptModal.TranscriptContentResponseExtended` — interface — `client/src/components/TranscriptModal.tsx:11-19`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `client/src/components/TranscriptModal.tsx:12` |
| `content` | `string` | — | `client/src/components/TranscriptModal.tsx:13` |
| `formats` | `?: { txt: boolean; srt: boolean; }` | — | `client/src/components/TranscriptModal.tsx:14` |
| `activeFormat` | `?: 'txt' \| 'srt'` | — | `client/src/components/TranscriptModal.tsx:18` |

### `client/src/components/TranscriptModal.TranscriptContentResponseExtended.formats` — type — `client/src/components/TranscriptModal.tsx:14-17`

| field | type | default | at |
|---|---|---|---|
| `txt` | `boolean` | — | `client/src/components/TranscriptModal.tsx:15` |
| `srt` | `boolean` | — | `client/src/components/TranscriptModal.tsx:16` |

### `client/src/components/TranscriptModal.TranscriptModalProps` — interface — `client/src/components/TranscriptModal.tsx:21-24`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `client/src/components/TranscriptModal.tsx:22` |
| `onClose` | `() => void` | — | `client/src/components/TranscriptModal.tsx:23` |

### `client/src/components/TranscriptSyncModal.Props` — interface — `client/src/components/TranscriptSyncModal.tsx:7-11`

| field | type | default | at |
|---|---|---|---|
| `projectCode` | `string` | — | `client/src/components/TranscriptSyncModal.tsx:8` |
| `projectPath` | `string` | — | `client/src/components/TranscriptSyncModal.tsx:9` |
| `onClose` | `() => void` | — | `client/src/components/TranscriptSyncModal.tsx:10` |

### `client/src/components/TranscriptSyncPanel.Props` — interface — `client/src/components/TranscriptSyncPanel.tsx:18-28`

| field | type | default | at | note |
|---|---|---|---|---|
| `projectCode` | `string` | — | `client/src/components/TranscriptSyncPanel.tsx:19` |  |
| `segmentName` | `string \| null` | — | `client/src/components/TranscriptSyncPanel.tsx:20` |  |
| `chapterName` | `?: string \| null` | — | `client/src/components/TranscriptSyncPanel.tsx:21` |  |
| `srtUrl` | `?: string \| null` | — | `client/src/components/TranscriptSyncPanel.tsx:23` | Direct URL to an SRT file — bypasses segment/chapter API lookup |
| `currentTime` | `number` | — | `client/src/components/TranscriptSyncPanel.tsx:24` |  |
| `onSeek` | `(time: number) => void` | — | `client/src/components/TranscriptSyncPanel.tsx:25` |  |
| `isCollapsed` | `boolean` | — | `client/src/components/TranscriptSyncPanel.tsx:26` |  |
| `onToggleCollapse` | `() => void` | — | `client/src/components/TranscriptSyncPanel.tsx:27` |  |

### `client/src/components/TranscriptionProgressBar.TranscriptionProgressBarProps` — interface — `client/src/components/TranscriptionProgressBar.tsx:7-9`

| field | type | default | at |
|---|---|---|---|
| `transcriptionData` | `TranscriptionsResponse \| undefined → shared/types.TranscriptionsResponse` | — | `client/src/components/TranscriptionProgressBar.tsx:8` |

### `client/src/components/VideoTranscriptModal.VideoTranscriptModalProps` — interface — `client/src/components/VideoTranscriptModal.tsx:9-11`

| field | type | default | at |
|---|---|---|---|
| `onClose` | `() => void` | — | `client/src/components/VideoTranscriptModal.tsx:10` |

### `client/src/components/VideoTranscriptModal.CombinedTranscriptResponse` — interface — `client/src/components/VideoTranscriptModal.tsx:13-19`

| field | type | default | at |
|---|---|---|---|
| `chapters` | `{ chapter: string; title: string; content: string; }[]` | — | `client/src/components/VideoTranscriptModal.tsx:14` |

### `client/src/components/WatchPage.ChapterGroup` — interface — `client/src/components/WatchPage.tsx:81-87`

| field | type | default | at |
|---|---|---|---|
| `chapterKey` | `string` | — | `client/src/components/WatchPage.tsx:82` |
| `title` | `string` | — | `client/src/components/WatchPage.tsx:83` |
| `files` | `RecordingFile[] → shared/types.RecordingFile` | — | `client/src/components/WatchPage.tsx:84` |
| `totalDuration` | `number` | — | `client/src/components/WatchPage.tsx:85` |
| `startTime` | `number` | — | `client/src/components/WatchPage.tsx:86` |

### `client/src/components/WatchPage.VideoMeta` — interface — `client/src/components/WatchPage.tsx:156-164`

| field | type | default | at |
|---|---|---|---|
| `url` | `string` | — | `client/src/components/WatchPage.tsx:157` |
| `title` | `string` | — | `client/src/components/WatchPage.tsx:158` |
| `isChapter` | `?: boolean` | — | `client/src/components/WatchPage.tsx:159` |
| `chapterKey` | `?: string` | — | `client/src/components/WatchPage.tsx:160` |
| `chapterLabel` | `?: string` | — | `client/src/components/WatchPage.tsx:161` |
| `segmentName` | `?: string` | — | `client/src/components/WatchPage.tsx:162` |
| `chapterFiles` | `?: RecordingFile[] → shared/types.RecordingFile` | — | `client/src/components/WatchPage.tsx:163` |

### `client/src/components/shared/BatchToolbar.BatchToolbarProps` — interface — `client/src/components/shared/BatchToolbar.tsx:12-24`

| field | type | default | at | note |
|---|---|---|---|---|
| `selectedCount` | `number` | — | `client/src/components/shared/BatchToolbar.tsx:13` |  |
| `selectedChapterInfo` | `string` | — | `client/src/components/shared/BatchToolbar.tsx:14` |  |
| `onRename` | `(newName: string) => void` | — | `client/src/components/shared/BatchToolbar.tsx:15` |  |
| `onMoveToChapter` | `(chapter: string) => void` | — | `client/src/components/shared/BatchToolbar.tsx:16` |  |
| `onAddTag` | `(tag: string) => void` | — | `client/src/components/shared/BatchToolbar.tsx:17` |  |
| `onRemoveTag` | `(tag: string) => void` | — | `client/src/components/shared/BatchToolbar.tsx:18` |  |
| `onSplitHere` | `() => void` | — | `client/src/components/shared/BatchToolbar.tsx:19` |  |
| `onDeselectAll` | `() => void` | — | `client/src/components/shared/BatchToolbar.tsx:20` |  |
| `availableTags` | `?: string[]` | — | `client/src/components/shared/BatchToolbar.tsx:21` |  |
| `selectedTags` | `?: string[]` | — | `client/src/components/shared/BatchToolbar.tsx:23` | Tags present in the current selection, for the remove-tag popover |

### `client/src/components/shared/ConfirmationModal.ConfirmationModalProps` — interface — `client/src/components/shared/ConfirmationModal.tsx:8-30`

| field | type | default | at | note |
|---|---|---|---|---|
| `title` | `string` | — | `client/src/components/shared/ConfirmationModal.tsx:10` | Modal title |
| `message` | `string` | — | `client/src/components/shared/ConfirmationModal.tsx:12` | Main message/question |
| `files` | `?: string[]` | — | `client/src/components/shared/ConfirmationModal.tsx:14` | Optional list of files to show |
| `filesLabel` | `?: string` | — | `client/src/components/shared/ConfirmationModal.tsx:16` | Heading above the file list (default: "Files to process:") |
| `maxFilesShown` | `?: number` | — | `client/src/components/shared/ConfirmationModal.tsx:18` | How many files to list before collapsing to "... and N more" (default: 3) |
| `warning` | `?: string` | — | `client/src/components/shared/ConfirmationModal.tsx:20` | Optional warning message |
| `confirmText` | `?: string` | — | `client/src/components/shared/ConfirmationModal.tsx:22` | Confirm button text (default: "Continue") |
| `cancelText` | `?: string` | — | `client/src/components/shared/ConfirmationModal.tsx:24` | Cancel button text (default: "Cancel") |
| `variant` | `?: 'primary' \| 'danger' \| 'warning'` | — | `client/src/components/shared/ConfirmationModal.tsx:26` | Confirm button color variant |
| `onConfirm` | `() => void` | — | `client/src/components/shared/ConfirmationModal.tsx:28` | Callbacks |
| `onCancel` | `() => void` | — | `client/src/components/shared/ConfirmationModal.tsx:29` |  |

### `client/src/components/shared/DictionaryQuickAdd.DictionaryQuickAddProps` — interface — `client/src/components/shared/DictionaryQuickAdd.tsx:5-11`

| field | type | default | at |
|---|---|---|---|
| `globalWords` | `string[]` | — | `client/src/components/shared/DictionaryQuickAdd.tsx:6` |
| `projectWords` | `string[]` | — | `client/src/components/shared/DictionaryQuickAdd.tsx:7` |
| `projectCode` | `string \| null` | — | `client/src/components/shared/DictionaryQuickAdd.tsx:8` |
| `onAddGlobal` | `(word: string) => Promise<void>` | — | `client/src/components/shared/DictionaryQuickAdd.tsx:9` |
| `onAddProject` | `(word: string) => Promise<void>` | — | `client/src/components/shared/DictionaryQuickAdd.tsx:10` |

### `client/src/components/shared/EditableFileRow.EditableFileRowProps` — interface — `client/src/components/shared/EditableFileRow.tsx:18-39`

| field | type | default | at | note |
|---|---|---|---|---|
| `recording` | `RecordingFile → shared/types.RecordingFile` | — | `client/src/components/shared/EditableFileRow.tsx:19` |  |
| `isSelected` | `boolean` | — | `client/src/components/shared/EditableFileRow.tsx:20` |  |
| `onToggleSelect` | `(filename: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:21` |  |
| `onInlineRename` | `(filename: string, field: 'chapter' \| 'name', newValue: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:22` |  |
| `onTagRemove` | `(filename: string, tag: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:23` |  |
| `onPlay` | `(recording: RecordingFile) => void → shared/types.RecordingFile` | — | `client/src/components/shared/EditableFileRow.tsx:24` |  |
| `onSplitHere` | `(filename: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:25` |  |
| `onPark` | `(filename: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:26` |  |
| `onSafe` | `(filename: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:27` |  |
| `onRestore` | `(filename: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:28` |  |
| `onUnpark` | `(filename: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:29` |  |
| `onDelete` | `(filename: string) => void` | — | `client/src/components/shared/EditableFileRow.tsx:31` | FR-156: Trash the recording and its sibling artifacts (shows a confirmation first) |
| `transcriptionBadge` | `?: ReactNode → ReactNode (react)` | — | `client/src/components/shared/EditableFileRow.tsx:33` | Rendered in the right-hand action area, typically a TranscriptionBadge component |
| `pendingChange` | `?: { oldFilename: string; newFilename: string }` | — | `client/src/components/shared/EditableFileRow.tsx:34` |  |
| `disabled` | `?: boolean` | — | `client/src/components/shared/EditableFileRow.tsx:35` |  |
| `formatDuration` | `(duration?: number) => string` | — | `client/src/components/shared/EditableFileRow.tsx:36` |  |
| `formatFileSize` | `(size: number) => string` | — | `client/src/components/shared/EditableFileRow.tsx:37` |  |
| `formatTimestamp` | `(timestamp: string) => string` | — | `client/src/components/shared/EditableFileRow.tsx:38` |  |

### `client/src/components/shared/EditableFileRow.EditableFileRowProps.pendingChange` — type — `client/src/components/shared/EditableFileRow.tsx:34`

| field | type | default | at |
|---|---|---|---|
| `oldFilename` | `string` | — | `client/src/components/shared/EditableFileRow.tsx:34` |
| `newFilename` | `string` | — | `client/src/components/shared/EditableFileRow.tsx:34` |

### `client/src/components/shared/ErrorMessage.ErrorMessageProps` — interface — `client/src/components/shared/ErrorMessage.tsx:1-3`

| field | type | default | at |
|---|---|---|---|
| `message` | `?: string` | — | `client/src/components/shared/ErrorMessage.tsx:2` |

### `client/src/components/shared/FileViewerModal.FileViewerModalProps` — interface — `client/src/components/shared/FileViewerModal.tsx:18-28`

| field | type | default | at |
|---|---|---|---|
| `title` | `string` | — | `client/src/components/shared/FileViewerModal.tsx:19` |
| `content` | `string \| null` | — | `client/src/components/shared/FileViewerModal.tsx:20` |
| `isLoading` | `boolean` | — | `client/src/components/shared/FileViewerModal.tsx:21` |
| `error` | `Error \| null` | — | `client/src/components/shared/FileViewerModal.tsx:22` |
| `onClose` | `() => void` | — | `client/src/components/shared/FileViewerModal.tsx:23` |
| `onCopy` | `?: () => void` | — | `client/src/components/shared/FileViewerModal.tsx:24` |
| `onOpenExternal` | `?: () => void` | — | `client/src/components/shared/FileViewerModal.tsx:25` |
| `folderKey` | `?: FolderKey → shared/types.FolderKey` | — | `client/src/components/shared/FileViewerModal.tsx:26` |
| `headerExtra` | `?: ReactNode → ReactNode (react)` | — | `client/src/components/shared/FileViewerModal.tsx:27` |

### `client/src/components/shared/InlineTitle.InlineTitleProps` — interface — `client/src/components/shared/InlineTitle.tsx:5-12`

| field | type | default | at |
|---|---|---|---|
| `value` | `string \| null \| undefined` | — | `client/src/components/shared/InlineTitle.tsx:6` |
| `placeholder` | `string` | — | `client/src/components/shared/InlineTitle.tsx:7` |
| `onSave` | `(value: string) => Promise<unknown> \| unknown` | — | `client/src/components/shared/InlineTitle.tsx:8` |
| `className` | `?: string` | — | `client/src/components/shared/InlineTitle.tsx:9` |
| `inputClassName` | `?: string` | — | `client/src/components/shared/InlineTitle.tsx:10` |
| `title` | `?: string` | — | `client/src/components/shared/InlineTitle.tsx:11` |

### `client/src/components/shared/LoadingSpinner.LoadingSpinnerProps` — interface — `client/src/components/shared/LoadingSpinner.tsx:1-3`

| field | type | default | at |
|---|---|---|---|
| `message` | `?: string` | — | `client/src/components/shared/LoadingSpinner.tsx:2` |

### `client/src/components/shared/OpenFolderButton.OpenFolderButtonProps` — interface — `client/src/components/shared/OpenFolderButton.tsx:4-8`

| field | type | default | at |
|---|---|---|---|
| `folder` | `FolderKey → shared/types.FolderKey` | — | `client/src/components/shared/OpenFolderButton.tsx:5` |
| `label` | `?: string` | — | `client/src/components/shared/OpenFolderButton.tsx:6` |
| `className` | `?: string` | — | `client/src/components/shared/OpenFolderButton.tsx:7` |

### `client/src/components/shared/PageContainer.PageContainerProps` — interface — `client/src/components/shared/PageContainer.tsx:3-5`

| field | type | default | at |
|---|---|---|---|
| `children` | `ReactNode → ReactNode (react)` | — | `client/src/components/shared/PageContainer.tsx:4` |

### `client/src/components/shared/PageHeader.PageHeaderProps` — interface — `client/src/components/shared/PageHeader.tsx:3-6`

| field | type | default | at |
|---|---|---|---|
| `title` | `string` | — | `client/src/components/shared/PageHeader.tsx:4` |
| `children` | `?: ReactNode → ReactNode (react)` | — | `client/src/components/shared/PageHeader.tsx:5` |

### `client/src/components/shared/PlayPauseButton.PlayPauseButtonProps` — interface — `client/src/components/shared/PlayPauseButton.tsx:4-7`

| field | type | default | at |
|---|---|---|---|
| `isPlaying` | `boolean` | — | `client/src/components/shared/PlayPauseButton.tsx:5` |
| `onClick` | `() => void` | — | `client/src/components/shared/PlayPauseButton.tsx:6` |

### `client/src/components/shared/PreviewPanel.PreviewChange` — interface — `client/src/components/shared/PreviewPanel.tsx:8-13`

B047: PreviewPanel — shows all pending changes before applying.

| field | type | default | at |
|---|---|---|---|
| `oldFilename` | `string` | — | `client/src/components/shared/PreviewPanel.tsx:9` |
| `newFilename` | `string` | — | `client/src/components/shared/PreviewPanel.tsx:10` |
| `transcriptCount` | `number` | — | `client/src/components/shared/PreviewPanel.tsx:11` |
| `needsReTranscription` | `boolean` | — | `client/src/components/shared/PreviewPanel.tsx:12` |

### `client/src/components/shared/PreviewPanel.PreviewPanelProps` — interface — `client/src/components/shared/PreviewPanel.tsx:15-21`

| field | type | default | at |
|---|---|---|---|
| `changes` | `PreviewChange[] → client/src/components/shared/PreviewPanel.PreviewChange` | — | `client/src/components/shared/PreviewPanel.tsx:16` |
| `splitInfo` | `?: { sourceChapter: string; newChapter: string }` | — | `client/src/components/shared/PreviewPanel.tsx:17` |
| `isApplying` | `boolean` | — | `client/src/components/shared/PreviewPanel.tsx:18` |
| `onApply` | `() => void` | — | `client/src/components/shared/PreviewPanel.tsx:19` |
| `onCancel` | `() => void` | — | `client/src/components/shared/PreviewPanel.tsx:20` |

### `client/src/components/shared/PreviewPanel.PreviewPanelProps.splitInfo` — type — `client/src/components/shared/PreviewPanel.tsx:17`

| field | type | default | at |
|---|---|---|---|
| `sourceChapter` | `string` | — | `client/src/components/shared/PreviewPanel.tsx:17` |
| `newChapter` | `string` | — | `client/src/components/shared/PreviewPanel.tsx:17` |

### `client/src/components/shared/SelectionBadge.SelectionBadgeProps` — interface — `client/src/components/shared/SelectionBadge.tsx:11-14`

SelectionBadge - Shows current selection scope

| field | type | default | at |
|---|---|---|---|
| `selectedCount` | `number` | — | `client/src/components/shared/SelectionBadge.tsx:12` |
| `totalCount` | `number` | — | `client/src/components/shared/SelectionBadge.tsx:13` |

### `client/src/components/shared/SizeToggle.SizeToggleProps` — interface — `client/src/components/shared/SizeToggle.tsx:3-8`

| field | type | default | at |
|---|---|---|---|
| `sizes` | `readonly T[]` | — | `client/src/components/shared/SizeToggle.tsx:4` |
| `value` | `T` | — | `client/src/components/shared/SizeToggle.tsx:5` |
| `onChange` | `(size: T) => void` | — | `client/src/components/shared/SizeToggle.tsx:6` |
| `labels` | `?: Partial<Record<T, string>>` | — | `client/src/components/shared/SizeToggle.tsx:7` |

### `client/src/components/shared/SlideOutDrawer.SlideOutDrawerProps` — interface — `client/src/components/shared/SlideOutDrawer.tsx:10-16`

| field | type | default | at |
|---|---|---|---|
| `isOpen` | `boolean` | — | `client/src/components/shared/SlideOutDrawer.tsx:11` |
| `title` | `string` | — | `client/src/components/shared/SlideOutDrawer.tsx:12` |
| `children` | `ReactNode → ReactNode (react)` | — | `client/src/components/shared/SlideOutDrawer.tsx:13` |
| `onClose` | `() => void` | — | `client/src/components/shared/SlideOutDrawer.tsx:14` |
| `width` | `?: string` | — | `client/src/components/shared/SlideOutDrawer.tsx:15` |

### `client/src/components/shared/SpeedControl.SpeedControlProps` — interface — `client/src/components/shared/SpeedControl.tsx:4-8`

| field | type | default | at |
|---|---|---|---|
| `presets` | `number[]` | — | `client/src/components/shared/SpeedControl.tsx:5` |
| `value` | `number` | — | `client/src/components/shared/SpeedControl.tsx:6` |
| `onChange` | `(speed: number) => void` | — | `client/src/components/shared/SpeedControl.tsx:7` |

### `client/src/components/shared/SplitMarker.SplitMarkerProps` — interface — `client/src/components/shared/SplitMarker.tsx:8-12`

B047: SplitMarker — amber dashed line between files showing chapter break point.

| field | type | default | at |
|---|---|---|---|
| `newChapter` | `string` | — | `client/src/components/shared/SplitMarker.tsx:9` |
| `fileCount` | `number` | — | `client/src/components/shared/SplitMarker.tsx:10` |
| `onRemove` | `() => void` | — | `client/src/components/shared/SplitMarker.tsx:11` |

### `client/src/components/shared/StoragePanel.StoragePanelProps` — interface — `client/src/components/shared/StoragePanel.tsx:43-49`

| field | type | default | at | note |
|---|---|---|---|---|
| `projectCode` | `string` | — | `client/src/components/shared/StoragePanel.tsx:44` |  |
| `brand` | `?: string` | — | `client/src/components/shared/StoragePanel.tsx:48` | Brand is currently unused by the panel (server derives paths from config), |

### `client/src/components/shared/ToolsSidebar.ToolsSidebarProps` — interface — `client/src/components/shared/ToolsSidebar.tsx:13-16`

| field | type | default | at |
|---|---|---|---|
| `activeTool` | `ActiveTool → client/src/components/ManagePanel.ActiveTool` | — | `client/src/components/shared/ToolsSidebar.tsx:14` |
| `onToolClick` | `(tool: ActiveTool) => void → client/src/components/ManagePanel.ActiveTool` | — | `client/src/components/shared/ToolsSidebar.tsx:15` |

### `client/src/components/shared/ToolsSidebar.ToolButtonProps` — interface — `client/src/components/shared/ToolsSidebar.tsx:81-87`

| field | type | default | at |
|---|---|---|---|
| `label` | `string` | — | `client/src/components/shared/ToolsSidebar.tsx:82` |
| `disabled` | `?: boolean` | — | `client/src/components/shared/ToolsSidebar.tsx:83` |
| `active` | `boolean` | — | `client/src/components/shared/ToolsSidebar.tsx:84` |
| `onClick` | `() => void` | — | `client/src/components/shared/ToolsSidebar.tsx:85` |
| `tooltip` | `string` | — | `client/src/components/shared/ToolsSidebar.tsx:86` |

### `client/src/components/shared/UndoToast.UndoToastProps` — interface — `client/src/components/shared/UndoToast.tsx:10-15`

| field | type | default | at |
|---|---|---|---|
| `message` | `string` | — | `client/src/components/shared/UndoToast.tsx:11` |
| `onUndo` | `() => void` | — | `client/src/components/shared/UndoToast.tsx:12` |
| `durationMs` | `?: number` | — | `client/src/components/shared/UndoToast.tsx:13` |
| `onExpire` | `() => void` | — | `client/src/components/shared/UndoToast.tsx:14` |

### `client/src/components/shared/VideoControlsBar.VideoControlsBarProps` — interface — `client/src/components/shared/VideoControlsBar.tsx:18-54`

| field | type | default | at |
|---|---|---|---|
| `isPlaying` | `boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:20` |
| `onPlayPause` | `() => void` | — | `client/src/components/shared/VideoControlsBar.tsx:21` |
| `playbackSpeed` | `number` | — | `client/src/components/shared/VideoControlsBar.tsx:22` |
| `onSpeedChange` | `(speed: number) => void` | — | `client/src/components/shared/VideoControlsBar.tsx:23` |
| `videoSize` | `VideoSize → client/src/components/shared/VideoControlsBar.VideoSize` | — | `client/src/components/shared/VideoControlsBar.tsx:26` |
| `onSizeChange` | `(size: VideoSize) => void → client/src/components/shared/VideoControlsBar.VideoSize` | — | `client/src/components/shared/VideoControlsBar.tsx:27` |
| `autoplay` | `boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:30` |
| `onToggleAutoplay` | `() => void` | — | `client/src/components/shared/VideoControlsBar.tsx:31` |
| `autoNext` | `boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:32` |
| `onToggleAutoNext` | `() => void` | — | `client/src/components/shared/VideoControlsBar.tsx:33` |
| `onPrevious` | `?: () => void` | — | `client/src/components/shared/VideoControlsBar.tsx:36` |
| `onNext` | `?: () => void` | — | `client/src/components/shared/VideoControlsBar.tsx:37` |
| `prevDisabled` | `?: boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:38` |
| `nextDisabled` | `?: boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:39` |
| `infoSlot` | `?: React.ReactNode → React (@types/react), ReactNode (@types/react)` | — | `client/src/components/shared/VideoControlsBar.tsx:42` |
| `onPark` | `?: () => void` | — | `client/src/components/shared/VideoControlsBar.tsx:45` |
| `isParkActive` | `?: boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:46` |
| `onShowSafe` | `?: () => void` | — | `client/src/components/shared/VideoControlsBar.tsx:49` |
| `showSafe` | `?: boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:50` |
| `onShowParked` | `?: () => void` | — | `client/src/components/shared/VideoControlsBar.tsx:51` |
| `showParked` | `?: boolean` | — | `client/src/components/shared/VideoControlsBar.tsx:52` |

### `client/src/components/shared/VideoPlayerModal.VideoPlayerModalProps` — interface — `client/src/components/shared/VideoPlayerModal.tsx:23-45`

| field | type | default | at | note |
|---|---|---|---|---|
| `title` | `string` | — | `client/src/components/shared/VideoPlayerModal.tsx:24` |  |
| `videoUrl` | `string` | — | `client/src/components/shared/VideoPlayerModal.tsx:25` |  |
| `onClose` | `() => void` | — | `client/src/components/shared/VideoPlayerModal.tsx:26` |  |
| `duration` | `?: number \| null` | — | `client/src/components/shared/VideoPlayerModal.tsx:27` |  |
| `size` | `?: number \| null` | — | `client/src/components/shared/VideoPlayerModal.tsx:28` |  |
| `projectCode` | `?: string` | — | `client/src/components/shared/VideoPlayerModal.tsx:30` | Optional: project code for transcript lookup |
| `recordingName` | `?: string \| null` | — | `client/src/components/shared/VideoPlayerModal.tsx:32` | Optional: recording filename to derive segment name for transcript |
| `showTranscript` | `?: boolean` | — | `client/src/components/shared/VideoPlayerModal.tsx:34` | Optional: show transcript sync panel (default false) |
| `srtUrl` | `?: string \| null` | — | `client/src/components/shared/VideoPlayerModal.tsx:36` | Optional: direct URL to an SRT file — bypasses segment API lookup |
| `onPrevious` | `?: () => void` | — | `client/src/components/shared/VideoPlayerModal.tsx:38` | B069: Navigate to previous item |
| `onNext` | `?: () => void` | — | `client/src/components/shared/VideoPlayerModal.tsx:40` | B069: Navigate to next item |
| `position` | `?: { current: number; total: number }` | — | `client/src/components/shared/VideoPlayerModal.tsx:42` | B069: Current position in the list |
| `dictionaryProps` | `?: DictionaryQuickAddProps → client/src/components/shared/DictionaryQuickAdd.DictionaryQuickAddProps` | — | `client/src/components/shared/VideoPlayerModal.tsx:44` | B070: When provided, renders DictionaryQuickAdd in the controls bar after speed buttons |

### `client/src/components/shared/VideoPlayerModal.VideoPlayerModalProps.position` — type — `client/src/components/shared/VideoPlayerModal.tsx:42`

| field | type | default | at |
|---|---|---|---|
| `current` | `number` | — | `client/src/components/shared/VideoPlayerModal.tsx:42` |
| `total` | `number` | — | `client/src/components/shared/VideoPlayerModal.tsx:42` |

### `client/src/components/shared/storage/StorageActions.StorageActionsProps` — interface — `client/src/components/shared/storage/StorageActions.tsx:19-33`

| field | type | default | at | note |
|---|---|---|---|---|
| `state` | `StorageState → shared/types.StorageState` | — | `client/src/components/shared/storage/StorageActions.tsx:20` |  |
| `heavyBytes` | `number` | — | `client/src/components/shared/storage/StorageActions.tsx:21` |  |
| `heldBytes` | `number` | — | `client/src/components/shared/storage/StorageActions.tsx:22` |  |
| `localBytes` | `number` | — | `client/src/components/shared/storage/StorageActions.tsx:23` |  |
| `ssdMounted` | `boolean` | — | `client/src/components/shared/storage/StorageActions.tsx:24` |  |
| `degraded` | `boolean` | — | `client/src/components/shared/storage/StorageActions.tsx:25` |  |
| `degradedReason` | `?: string` | — | `client/src/components/shared/storage/StorageActions.tsx:26` |  |
| `pendingAction` | `null \| 'hold' \| 'restore' \| 'archive' \| 'held-archive'` | — | `client/src/components/shared/storage/StorageActions.tsx:27` |  |
| `onHold` | `() => void` | — | `client/src/components/shared/storage/StorageActions.tsx:28` |  |
| `onRestore` | `() => void` | — | `client/src/components/shared/storage/StorageActions.tsx:29` |  |
| `onArchive` | `() => void` | — | `client/src/components/shared/storage/StorageActions.tsx:30` |  |
| `onHeldArchive` | `() => void` | — | `client/src/components/shared/storage/StorageActions.tsx:32` | Held → Archive chain: restore first, then archive on success. |

### `client/src/components/shared/storage/StorageActivityFeed.StorageActivityFeedProps` — interface — `client/src/components/shared/storage/StorageActivityFeed.tsx:14-17`

| field | type | default | at |
|---|---|---|---|
| `projectCode` | `string` | — | `client/src/components/shared/storage/StorageActivityFeed.tsx:15` |
| `limit` | `?: number` | — | `client/src/components/shared/storage/StorageActivityFeed.tsx:16` |

### `client/src/components/shared/storage/StorageStateHeader.Props` — interface — `client/src/components/shared/storage/StorageStateHeader.tsx:5-7`

| field | type | default | at |
|---|---|---|---|
| `state` | `StorageState → shared/types.StorageState` | — | `client/src/components/shared/storage/StorageStateHeader.tsx:6` |

### `client/src/components/shared/storage/StorageTree.Props` — interface — `client/src/components/shared/storage/StorageTree.tsx:14-17`

| field | type | default | at |
|---|---|---|---|
| `nodes` | `StorageTreeNode[] → shared/types.StorageTreeNode` | — | `client/src/components/shared/storage/StorageTree.tsx:15` |
| `state` | `StorageState → shared/types.StorageState` | — | `client/src/components/shared/storage/StorageTree.tsx:16` |

### `client/src/hooks/useAssetApi.ClipboardAssignRequest` — interface — `client/src/hooks/useAssetApi.ts:180-187`

| field | type | default | at |
|---|---|---|---|
| `imageData` | `string` | — | `client/src/hooks/useAssetApi.ts:181` |
| `chapter` | `string` | — | `client/src/hooks/useAssetApi.ts:182` |
| `sequence` | `string` | — | `client/src/hooks/useAssetApi.ts:183` |
| `imageOrder` | `string` | — | `client/src/hooks/useAssetApi.ts:184` |
| `variant` | `string \| null` | — | `client/src/hooks/useAssetApi.ts:185` |
| `label` | `string` | — | `client/src/hooks/useAssetApi.ts:186` |

### `client/src/hooks/useBestTake.BestTakeResult` — interface — `client/src/hooks/useBestTake.ts:5-8`

| field | type | default | at |
|---|---|---|---|
| `bestTakePath` | `string \| null` | — | `client/src/hooks/useBestTake.ts:6` |
| `goodTakePath` | `string \| null` | — | `client/src/hooks/useBestTake.ts:7` |

### `client/src/hooks/useBrandsApi.BrandInfo` — interface — `client/src/hooks/useBrandsApi.ts:5-13`

| field | type | default | at |
|---|---|---|---|
| `key` | `string` | — | `client/src/hooks/useBrandsApi.ts:6` |
| `name` | `string` | — | `client/src/hooks/useBrandsApi.ts:7` |
| `root` | `string` | — | `client/src/hooks/useBrandsApi.ts:8` |
| `publishedPath` | `string \| null` | — | `client/src/hooks/useBrandsApi.ts:9` |
| `holdingPath` | `string \| null` | — | `client/src/hooks/useBrandsApi.ts:10` |
| `source` | `'brands.json' \| 'disk'` | — | `client/src/hooks/useBrandsApi.ts:11` |
| `active` | `boolean` | — | `client/src/hooks/useBrandsApi.ts:12` |

### `client/src/hooks/useBrollApi.BrollFile` — interface — `client/src/hooks/useBrollApi.ts:6-10`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `client/src/hooks/useBrollApi.ts:7` |
| `size` | `number` | — | `client/src/hooks/useBrollApi.ts:8` |
| `timestamp` | `string` | — | `client/src/hooks/useBrollApi.ts:9` |

### `client/src/hooks/useConfigApi.WatcherInfo` — interface — `client/src/hooks/useConfigApi.ts:51-55`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `client/src/hooks/useConfigApi.ts:52` |
| `pattern` | `string \| string[]` | — | `client/src/hooks/useConfigApi.ts:53` |
| `status` | `'active' \| 'error'` | — | `client/src/hooks/useConfigApi.ts:54` |

### `client/src/hooks/useConfigApi.BrandConfigAffiliate` — interface — `client/src/hooks/useConfigApi.ts:65-69`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `client/src/hooks/useConfigApi.ts:66` |
| `url` | `string` | — | `client/src/hooks/useConfigApi.ts:67` |
| `active` | `boolean` | — | `client/src/hooks/useConfigApi.ts:68` |

### `client/src/hooks/useConfigApi.BrandConfigRaw` — interface — `client/src/hooks/useConfigApi.ts:70-78`

| field | type | default | at |
|---|---|---|---|
| `brand` | `{ name: string; realName: string; profession: string; tagline: string }` | — | `client/src/hooks/useConfigApi.ts:71` |
| `socialLinks` | `{ website: string; twitter: string; youtubeMain: string; youtubeAITLDR: string; skool: string }` | — | `client/src/hooks/useConfigApi.ts:72` |
| `ctas` | `{ primaryCta: { label: string; url: string }; foldCta: { label: string; url: string } }` | — | `client/src/hooks/useConfigApi.ts:73` |
| `affiliates` | `BrandConfigAffiliate[] → client/src/hooks/useConfigApi.BrandConfigAffiliate` | — | `client/src/hooks/useConfigApi.ts:74` |
| `descriptionTemplate` | `{ legalDisclosure: string; endNote: string }` | — | `client/src/hooks/useConfigApi.ts:75` |
| `playlists` | `?: Record<string, string>` | — | `client/src/hooks/useConfigApi.ts:76` |
| `_meta` | `?: Record<string, string>` | — | `client/src/hooks/useConfigApi.ts:77` |

### `client/src/hooks/useConfigApi.BrandConfigRaw.brand` — type — `client/src/hooks/useConfigApi.ts:71`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `client/src/hooks/useConfigApi.ts:71` |
| `realName` | `string` | — | `client/src/hooks/useConfigApi.ts:71` |
| `profession` | `string` | — | `client/src/hooks/useConfigApi.ts:71` |
| `tagline` | `string` | — | `client/src/hooks/useConfigApi.ts:71` |

### `client/src/hooks/useConfigApi.BrandConfigRaw.socialLinks` — type — `client/src/hooks/useConfigApi.ts:72`

| field | type | default | at |
|---|---|---|---|
| `website` | `string` | — | `client/src/hooks/useConfigApi.ts:72` |
| `twitter` | `string` | — | `client/src/hooks/useConfigApi.ts:72` |
| `youtubeMain` | `string` | — | `client/src/hooks/useConfigApi.ts:72` |
| `youtubeAITLDR` | `string` | — | `client/src/hooks/useConfigApi.ts:72` |
| `skool` | `string` | — | `client/src/hooks/useConfigApi.ts:72` |

### `client/src/hooks/useConfigApi.BrandConfigRaw.ctas` — type — `client/src/hooks/useConfigApi.ts:73`

| field | type | default | at |
|---|---|---|---|
| `primaryCta` | `{ label: string; url: string }` | — | `client/src/hooks/useConfigApi.ts:73` |
| `foldCta` | `{ label: string; url: string }` | — | `client/src/hooks/useConfigApi.ts:73` |

### `client/src/hooks/useConfigApi.BrandConfigRaw.ctas.foldCta` — type — `client/src/hooks/useConfigApi.ts:73`

| field | type | default | at |
|---|---|---|---|
| `label` | `string` | — | `client/src/hooks/useConfigApi.ts:73` |
| `url` | `string` | — | `client/src/hooks/useConfigApi.ts:73` |

### `client/src/hooks/useConfigApi.BrandConfigRaw.ctas.primaryCta` — type — `client/src/hooks/useConfigApi.ts:73`

| field | type | default | at |
|---|---|---|---|
| `label` | `string` | — | `client/src/hooks/useConfigApi.ts:73` |
| `url` | `string` | — | `client/src/hooks/useConfigApi.ts:73` |

### `client/src/hooks/useConfigApi.BrandConfigRaw.descriptionTemplate` — type — `client/src/hooks/useConfigApi.ts:75`

| field | type | default | at |
|---|---|---|---|
| `legalDisclosure` | `string` | — | `client/src/hooks/useConfigApi.ts:75` |
| `endNote` | `string` | — | `client/src/hooks/useConfigApi.ts:75` |

### `client/src/hooks/useEditApi.PrepData` — interface — `client/src/hooks/useEditApi.ts:15-33`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `client/src/hooks/useEditApi.ts:16` |
| `error` | `?: string` | — | `client/src/hooks/useEditApi.ts:17` |
| `project` | `{ code: string; name: string; fullCode: string; }` | — | `client/src/hooks/useEditApi.ts:18` |
| `glingFilename` | `string` | — | `client/src/hooks/useEditApi.ts:23` |
| `glingDictionary` | `string[]` | — | `client/src/hooks/useEditApi.ts:24` |
| `globalDictionary` | `string[]` | — | `client/src/hooks/useEditApi.ts:25` |
| `projectDictionary` | `string[]` | — | `client/src/hooks/useEditApi.ts:26` |
| `recordings` | `{ name: string; size: number }[]` | — | `client/src/hooks/useEditApi.ts:27` |
| `recordingsTotal` | `number` | — | `client/src/hooks/useEditApi.ts:28` |
| `editFolders` | `{ allExist: boolean; folders: { name: string; exists: boolean }[]; }` | — | `client/src/hooks/useEditApi.ts:29` |

### `client/src/hooks/useEditApi.PrepData.project` — type — `client/src/hooks/useEditApi.ts:18-22`

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `client/src/hooks/useEditApi.ts:19` |
| `name` | `string` | — | `client/src/hooks/useEditApi.ts:20` |
| `fullCode` | `string` | — | `client/src/hooks/useEditApi.ts:21` |

### `client/src/hooks/useEditApi.PrepData.editFolders` — type — `client/src/hooks/useEditApi.ts:29-32`

| field | type | default | at |
|---|---|---|---|
| `allExist` | `boolean` | — | `client/src/hooks/useEditApi.ts:30` |
| `folders` | `{ name: string; exists: boolean }[]` | — | `client/src/hooks/useEditApi.ts:31` |

### `client/src/hooks/useMicAnalyser.MicMetrics` — interface — `client/src/hooks/useMicAnalyser.ts:63-73`

| field | type | default | at |
|---|---|---|---|
| `shortTermLufs` | `number` | — | `client/src/hooks/useMicAnalyser.ts:64` |
| `samplePeakDbfs` | `number` | — | `client/src/hooks/useMicAnalyser.ts:65` |
| `samplePeakLinear` | `number` | — | `client/src/hooks/useMicAnalyser.ts:66` |
| `clipCount` | `number` | — | `client/src/hooks/useMicAnalyser.ts:67` |
| `nearClipCount` | `number` | — | `client/src/hooks/useMicAnalyser.ts:68` |
| `windowFull` | `boolean` | — | `client/src/hooks/useMicAnalyser.ts:69` |
| `windowFillRatio` | `number` | — | `client/src/hooks/useMicAnalyser.ts:70` |
| `channelCount` | `number` | — | `client/src/hooks/useMicAnalyser.ts:71` |
| `sampleRate` | `number` | — | `client/src/hooks/useMicAnalyser.ts:72` |

### `client/src/hooks/useMicAnalyser.ConstraintReport` — interface — `client/src/hooks/useMicAnalyser.ts:75-84`

| field | type | default | at | note |
|---|---|---|---|---|
| `asked` | `Record<string, unknown>` | — | `client/src/hooks/useMicAnalyser.ts:77` | What we demanded. `exact` means Chrome throws rather than silently ignoring. |
| `got` | `MediaTrackSettings` | — | `client/src/hooks/useMicAnalyser.ts:79` | What the track actually reports — Chrome's view of Chrome's own chain. |
| `capable` | `MediaTrackCapabilities \| null` | — | `client/src/hooks/useMicAnalyser.ts:81` | What the device says it can do. |
| `supported` | `MediaTrackSupportedConstraints` | — | `client/src/hooks/useMicAnalyser.ts:83` | What this browser build understands as a constraint at all. |

### `client/src/hooks/useMicAnalyser.DeviceChoice` — interface — `client/src/hooks/useMicAnalyser.ts:86-89`

| field | type | default | at |
|---|---|---|---|
| `deviceId` | `string` | — | `client/src/hooks/useMicAnalyser.ts:87` |
| `label` | `string` | — | `client/src/hooks/useMicAnalyser.ts:88` |

### `client/src/hooks/useMicAnalyser.MicError` — interface — `client/src/hooks/useMicAnalyser.ts:91-96`

| field | type | default | at | note |
|---|---|---|---|---|
| `title` | `string` | — | `client/src/hooks/useMicAnalyser.ts:92` |  |
| `detail` | `string` | — | `client/src/hooks/useMicAnalyser.ts:93` |  |
| `devicesSeen` | `?: DeviceChoice[] → client/src/hooks/useMicAnalyser.DeviceChoice` | — | `client/src/hooks/useMicAnalyser.ts:95` | Devices seen, so a failure to find the mic is diagnosable rather than mysterious. |

### `client/src/hooks/useMicAnalyser.ProbeResult` — interface — `client/src/hooks/useMicAnalyser.ts:101-110`

| field | type | default | at | note |
|---|---|---|---|---|
| `verdict` | `ProbeVerdict → client/src/hooks/useMicAnalyser.ProbeVerdict` | — | `client/src/hooks/useMicAnalyser.ts:102` |  |
| `findings` | `string[]` | — | `client/src/hooks/useMicAnalyser.ts:104` | Plain-language findings; always populated, including for `inconclusive`. |
| `capturedLevelDbfs` | `number` | — | `client/src/hooks/useMicAnalyser.ts:105` |  |
| `levelDriftDb` | `number` | — | `client/src/hooks/useMicAnalyser.ts:106` |  |
| `deepestNotchDb` | `number` | — | `client/src/hooks/useMicAnalyser.ts:107` |  |
| `spectrum` | `number[]` | — | `client/src/hooks/useMicAnalyser.ts:108` |  |
| `binHz` | `number` | — | `client/src/hooks/useMicAnalyser.ts:109` |  |

### `client/src/hooks/useOpenFolder.OpenFolderOptions` — interface — `client/src/hooks/useOpenFolder.ts:9-12`

| field | type | default | at |
|---|---|---|---|
| `folder` | `FolderKey → shared/types.FolderKey` | — | `client/src/hooks/useOpenFolder.ts:10` |
| `projectCode` | `?: string` | — | `client/src/hooks/useOpenFolder.ts:11` |

### `client/src/hooks/usePoemWuiApi.AwbJsonInfo` — interface — `client/src/hooks/usePoemWuiApi.ts:6-12`

| field | type | default | at |
|---|---|---|---|
| `exists` | `boolean` | — | `client/src/hooks/usePoemWuiApi.ts:7` |
| `savedAt` | `string \| null` | — | `client/src/hooks/usePoemWuiApi.ts:8` |
| `currentStepId` | `string \| null` | — | `client/src/hooks/usePoemWuiApi.ts:9` |
| `sizeKb` | `number \| null` | — | `client/src/hooks/usePoemWuiApi.ts:10` |
| `fullPath` | `string` | — | `client/src/hooks/usePoemWuiApi.ts:11` |

### `client/src/hooks/usePoemWuiApi.FliHubChapter` — interface — `client/src/hooks/usePoemWuiApi.ts:14-18`

| field | type | default | at |
|---|---|---|---|
| `folderNumber` | `string` | — | `client/src/hooks/usePoemWuiApi.ts:15` |
| `chapterName` | `string` | — | `client/src/hooks/usePoemWuiApi.ts:16` |
| `firstWords` | `string \| null` | — | `client/src/hooks/usePoemWuiApi.ts:17` |

### `client/src/hooks/usePoemWuiApi.PoemWuiStatus` — interface — `client/src/hooks/usePoemWuiApi.ts:20-34`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `client/src/hooks/usePoemWuiApi.ts:21` |
| `error` | `?: string` | — | `client/src/hooks/usePoemWuiApi.ts:22` |
| `projectFolder` | `?: string` | — | `client/src/hooks/usePoemWuiApi.ts:23` |
| `transcriptFound` | `boolean` | — | `client/src/hooks/usePoemWuiApi.ts:24` |
| `srtFile` | `string \| null` | — | `client/src/hooks/usePoemWuiApi.ts:25` |
| `srtFiles` | `?: string[]` | — | `client/src/hooks/usePoemWuiApi.ts:26` |
| `transcript` | `string \| null` | — | `client/src/hooks/usePoemWuiApi.ts:27` |
| `srtRaw` | `?: string \| null` | — | `client/src/hooks/usePoemWuiApi.ts:28` |
| `brandConfigFound` | `?: boolean` | — | `client/src/hooks/usePoemWuiApi.ts:29` |
| `brandConfigPath` | `?: string \| null` | — | `client/src/hooks/usePoemWuiApi.ts:30` |
| `brandConfig` | `?: unknown` | — | `client/src/hooks/usePoemWuiApi.ts:31` |
| `fliHubChapters` | `?: FliHubChapter[] → client/src/hooks/usePoemWuiApi.FliHubChapter` | — | `client/src/hooks/usePoemWuiApi.ts:32` |
| `awbJson` | `?: AwbJsonInfo → client/src/hooks/usePoemWuiApi.AwbJsonInfo` | — | `client/src/hooks/usePoemWuiApi.ts:33` |

### `client/src/hooks/usePoemWuiApi.SendResult` — interface — `client/src/hooks/usePoemWuiApi.ts:36-39`

| field | type | default | at |
|---|---|---|---|
| `ok` | `boolean` | — | `client/src/hooks/usePoemWuiApi.ts:37` |
| `error` | `?: string` | — | `client/src/hooks/usePoemWuiApi.ts:38` |

### `client/src/hooks/usePoemWuiApi.YloResult` — interface — `client/src/hooks/usePoemWuiApi.ts:70-80`

| field | type | default | at |
|---|---|---|---|
| `ok` | `boolean` | — | `client/src/hooks/usePoemWuiApi.ts:71` |
| `error` | `?: string` | — | `client/src/hooks/usePoemWuiApi.ts:72` |
| `result` | `?: { success: boolean; project_id?: string; project_name?: string; stage?: number; message?: string; }` | — | `client/src/hooks/usePoemWuiApi.ts:73` |

### `client/src/hooks/usePoemWuiApi.YloResult.result` — type — `client/src/hooks/usePoemWuiApi.ts:73-79`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `client/src/hooks/usePoemWuiApi.ts:74` |
| `project_id` | `?: string` | — | `client/src/hooks/usePoemWuiApi.ts:75` |
| `project_name` | `?: string` | — | `client/src/hooks/usePoemWuiApi.ts:76` |
| `stage` | `?: number` | — | `client/src/hooks/usePoemWuiApi.ts:77` |
| `message` | `?: string` | — | `client/src/hooks/usePoemWuiApi.ts:78` |

### `client/src/hooks/useProjectsApi.NextCodeResponse` — interface — `client/src/hooks/useProjectsApi.ts:286-293`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `client/src/hooks/useProjectsApi.ts:287` |
| `state` | `'ok' \| 'empty' \| 'unreadable' \| 'exhausted'` | — | `client/src/hooks/useProjectsApi.ts:288` |
| `next` | `string \| null` | — | `client/src/hooks/useProjectsApi.ts:289` |
| `highest` | `string \| null` | — | `client/src/hooks/useProjectsApi.ts:290` |
| `root` | `string` | — | `client/src/hooks/useProjectsApi.ts:291` |
| `reason` | `?: string` | — | `client/src/hooks/useProjectsApi.ts:292` |

### `client/src/hooks/useRecordingsApi.TrashArtifact` — interface — `client/src/hooks/useRecordingsApi.ts:67-73`

| field | type | default | at |
|---|---|---|---|
| `kind` | `'recording' \| 'transcript'` | — | `client/src/hooks/useRecordingsApi.ts:68` |
| `label` | `string` | — | `client/src/hooks/useRecordingsApi.ts:69` |
| `path` | `string` | — | `client/src/hooks/useRecordingsApi.ts:70` |
| `filename` | `string` | — | `client/src/hooks/useRecordingsApi.ts:71` |
| `size` | `number` | — | `client/src/hooks/useRecordingsApi.ts:72` |

### `client/src/hooks/useRecordingsApi.TrashPreviewItem` — interface — `client/src/hooks/useRecordingsApi.ts:75-79`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `client/src/hooks/useRecordingsApi.ts:76` |
| `artifacts` | `TrashArtifact[] → client/src/hooks/useRecordingsApi.TrashArtifact` | — | `client/src/hooks/useRecordingsApi.ts:77` |
| `totalBytes` | `number` | — | `client/src/hooks/useRecordingsApi.ts:78` |

### `client/src/hooks/useRecordingsApi.TrashRecordingsResponse` — interface — `client/src/hooks/useRecordingsApi.ts:81-91`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `client/src/hooks/useRecordingsApi.ts:82` |
| `dryRun` | `?: boolean` | — | `client/src/hooks/useRecordingsApi.ts:83` |
| `items` | `?: TrashPreviewItem[] → client/src/hooks/useRecordingsApi.TrashPreviewItem` | — | `client/src/hooks/useRecordingsApi.ts:84` |
| `trashed` | `?: string[]` | — | `client/src/hooks/useRecordingsApi.ts:85` |
| `count` | `?: number` | — | `client/src/hooks/useRecordingsApi.ts:86` |
| `artifactCount` | `?: number` | — | `client/src/hooks/useRecordingsApi.ts:87` |
| `totalBytes` | `?: number` | — | `client/src/hooks/useRecordingsApi.ts:88` |
| `errors` | `?: string[]` | — | `client/src/hooks/useRecordingsApi.ts:89` |
| `error` | `?: string` | — | `client/src/hooks/useRecordingsApi.ts:90` |

### `client/src/hooks/useShiftHover.ImagePreview` — interface — `client/src/hooks/useShiftHover.ts:3-9`

| field | type | default | at |
|---|---|---|---|
| `type` | `'image'` | — | `client/src/hooks/useShiftHover.ts:4` |
| `url` | `string` | — | `client/src/hooks/useShiftHover.ts:5` |
| `filename` | `string` | — | `client/src/hooks/useShiftHover.ts:6` |
| `size` | `number` | — | `client/src/hooks/useShiftHover.ts:7` |
| `timestamp` | `string` | — | `client/src/hooks/useShiftHover.ts:8` |

### `client/src/hooks/useShiftHover.TextPreview` — interface — `client/src/hooks/useShiftHover.ts:11-15`

| field | type | default | at |
|---|---|---|---|
| `type` | `'text'` | — | `client/src/hooks/useShiftHover.ts:12` |
| `content` | `string` | — | `client/src/hooks/useShiftHover.ts:13` |
| `filename` | `string` | — | `client/src/hooks/useShiftHover.ts:14` |

### `client/src/hooks/useShiftHover.PreviewContent` — type-union on `type` — `client/src/hooks/useShiftHover.ts:17`

| variant | shape | default | at |
|---|---|---|---|
| `image` | `ImagePreview` | — | `client/src/hooks/useShiftHover.ts:4` |
| `text` | `TextPreview` | — | `client/src/hooks/useShiftHover.ts:12` |

### `client/src/hooks/useShiftHover.PreviewState` — interface — `client/src/hooks/useShiftHover.ts:19-22`

| field | type | default | at |
|---|---|---|---|
| `content` | `PreviewContent → client/src/hooks/useShiftHover.PreviewContent` | — | `client/src/hooks/useShiftHover.ts:20` |
| `position` | `{ x: number; y: number }` | — | `client/src/hooks/useShiftHover.ts:21` |

### `client/src/hooks/useShiftHover.PreviewState.position` — type — `client/src/hooks/useShiftHover.ts:21`

| field | type | default | at |
|---|---|---|---|
| `x` | `number` | — | `client/src/hooks/useShiftHover.ts:21` |
| `y` | `number` | — | `client/src/hooks/useShiftHover.ts:21` |

### `client/src/hooks/useShiftHover.UseShiftHoverReturn` — interface — `client/src/hooks/useShiftHover.ts:32-40`

| field | type | default | at |
|---|---|---|---|
| `shiftHeld` | `boolean` | — | `client/src/hooks/useShiftHover.ts:33` |
| `preview` | `PreviewState → client/src/hooks/useShiftHover.PreviewState` | — | `client/src/hooks/useShiftHover.ts:34` |
| `handleMouseEnter` | `(image: LegacyImageData, e: React.MouseEvent) => void → client/src/hooks/useShiftHover.LegacyImageData, React (@types/react), MouseEvent (@types/react)` | — | `client/src/hooks/useShiftHover.ts:36` |
| `handlePreviewEnter` | `(content: PreviewContent, e: React.MouseEvent) => void → client/src/hooks/useShiftHover.PreviewContent, React (@types/react), MouseEvent (@types/react)` | — | `client/src/hooks/useShiftHover.ts:37` |
| `handleMouseMove` | `(e: React.MouseEvent) => void → React (@types/react), MouseEvent (@types/react)` | — | `client/src/hooks/useShiftHover.ts:38` |
| `handleMouseLeave` | `() => void` | — | `client/src/hooks/useShiftHover.ts:39` |

### `client/src/hooks/useThumbsApi.ThumbInfo` — interface — `client/src/hooks/useThumbsApi.ts:6-12`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `client/src/hooks/useThumbsApi.ts:7` |
| `path` | `string` | — | `client/src/hooks/useThumbsApi.ts:8` |
| `size` | `number` | — | `client/src/hooks/useThumbsApi.ts:9` |
| `timestamp` | `string` | — | `client/src/hooks/useThumbsApi.ts:10` |
| `order` | `number` | — | `client/src/hooks/useThumbsApi.ts:11` |

### `client/src/hooks/useThumbsApi.ZipInfo` — interface — `client/src/hooks/useThumbsApi.ts:14-20`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `client/src/hooks/useThumbsApi.ts:15` |
| `path` | `string` | — | `client/src/hooks/useThumbsApi.ts:16` |
| `size` | `number` | — | `client/src/hooks/useThumbsApi.ts:17` |
| `timestamp` | `string` | — | `client/src/hooks/useThumbsApi.ts:18` |
| `imageCount` | `number` | — | `client/src/hooks/useThumbsApi.ts:19` |

### `client/src/hooks/useThumbsApi.ZipImagePreview` — interface — `client/src/hooks/useThumbsApi.ts:22-26`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `client/src/hooks/useThumbsApi.ts:23` |
| `size` | `number` | — | `client/src/hooks/useThumbsApi.ts:24` |
| `dataUrl` | `string` | — | `client/src/hooks/useThumbsApi.ts:25` |

### `client/src/hooks/useVideoAspect.UseVideoAspectReturn` — interface — `client/src/hooks/useVideoAspect.ts:14-22`

| field | type | default | at | note |
|---|---|---|---|---|
| `aspect` | `number` | — | `client/src/hooks/useVideoAspect.ts:16` | width / height of the loaded video, or DEFAULT_ASPECT before metadata loads |
| `isPortrait` | `boolean` | — | `client/src/hooks/useVideoAspect.ts:17` |  |
| `readAspect` | `(el: HTMLVideoElement \| null) => void` | — | `client/src/hooks/useVideoAspect.ts:19` | Call from the <video> onLoadedMetadata handler |
| `reset` | `() => void` | — | `client/src/hooks/useVideoAspect.ts:21` | Call when the source changes, so prev/next re-measures instead of inheriting |

### `client/src/hooks/useVideoPlayback.UseVideoPlaybackOptions` — interface — `client/src/hooks/useVideoPlayback.ts:14-19`

| field | type | default | at | note |
|---|---|---|---|---|
| `onEscape` | `?: () => void` | — | `client/src/hooks/useVideoPlayback.ts:16` | Called when Escape is pressed (e.g., close a modal) |
| `keyboardControls` | `?: boolean` | — | `client/src/hooks/useVideoPlayback.ts:18` | Enable Space-to-pause keyboard shortcut (default: true) |

### `client/src/hooks/useVideoPlayback.UseVideoPlaybackReturn` — interface — `client/src/hooks/useVideoPlayback.ts:21-34`

| field | type | default | at | note |
|---|---|---|---|---|
| `videoRef` | `React.RefObject<HTMLVideoElement \| null> → React (@types/react), RefObject (@types/react)` | — | `client/src/hooks/useVideoPlayback.ts:22` |  |
| `isPlaying` | `boolean` | — | `client/src/hooks/useVideoPlayback.ts:23` |  |
| `playbackSpeed` | `number` | — | `client/src/hooks/useVideoPlayback.ts:24` |  |
| `handlePlayPause` | `() => void` | — | `client/src/hooks/useVideoPlayback.ts:25` |  |
| `handleSpeedChange` | `(speed: number) => void` | — | `client/src/hooks/useVideoPlayback.ts:26` |  |
| `videoEventHandlers` | `{ onLoadedMetadata: () => void; onPlay: () => void; onPause: () => void; onEnded: () => void; }` | — | `client/src/hooks/useVideoPlayback.ts:28` | Attach these to the <video> element |

### `client/src/hooks/useVideoPlayback.UseVideoPlaybackReturn.videoEventHandlers` — type — `client/src/hooks/useVideoPlayback.ts:28-33`

| field | type | default | at |
|---|---|---|---|
| `onLoadedMetadata` | `() => void` | — | `client/src/hooks/useVideoPlayback.ts:29` |
| `onPlay` | `() => void` | — | `client/src/hooks/useVideoPlayback.ts:30` |
| `onPause` | `() => void` | — | `client/src/hooks/useVideoPlayback.ts:31` |
| `onEnded` | `() => void` | — | `client/src/hooks/useVideoPlayback.ts:32` |

### `client/src/utils/fileActions.TrashResult` — interface — `client/src/utils/fileActions.ts:3-7`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `client/src/utils/fileActions.ts:4` |
| `trashPath` | `?: string` | — | `client/src/utils/fileActions.ts:5` |
| `error` | `?: string` | — | `client/src/utils/fileActions.ts:6` |

### `client/src/utils/fileActions.DiscardResult` — interface — `client/src/utils/fileActions.ts:9-12`

| field | type | default | at |
|---|---|---|---|
| `successCount` | `number` | — | `client/src/utils/fileActions.ts:10` |
| `failedCount` | `number` | — | `client/src/utils/fileActions.ts:11` |

### `client/src/utils/micGrading.Reading` — interface — `client/src/utils/micGrading.ts:24-34`

| field | type | default | at | note |
|---|---|---|---|---|
| `grade` | `Grade → client/src/utils/micGrading.Grade` | — | `client/src/utils/micGrading.ts:25` |  |
| `value` | `string \| null` | — | `client/src/utils/micGrading.ts:27` | Formatted value, or null when there is nothing to show. |
| `message` | `string \| null` | — | `client/src/utils/micGrading.ts:29` | The imperative. Required for orange/red, and the reason for grey. |
| `basis` | `string` | — | `client/src/utils/micGrading.ts:31` | Where the threshold comes from — surfaced by the "why?" affordance (UI rule 5). |
| `isConvention` | `boolean` | — | `client/src/utils/micGrading.ts:33` | True when the threshold is a convention rather than a published standard. |

### `client/src/utils/micGrading.LoudnessInput` — interface — `client/src/utils/micGrading.ts:73-77`

| field | type | default | at |
|---|---|---|---|
| `shortTermLufs` | `number` | — | `client/src/utils/micGrading.ts:74` |
| `windowFull` | `boolean` | — | `client/src/utils/micGrading.ts:75` |
| `windowFillRatio` | `number` | — | `client/src/utils/micGrading.ts:76` |

### `client/src/utils/micGrading.PeakInput` — interface — `client/src/utils/micGrading.ts:142-145`

| field | type | default | at |
|---|---|---|---|
| `samplePeakDbfs` | `number` | — | `client/src/utils/micGrading.ts:143` |
| `hasSignal` | `boolean` | — | `client/src/utils/micGrading.ts:144` |

### `client/src/utils/micGrading.ClipInput` — interface — `client/src/utils/micGrading.ts:192-196`

| field | type | default | at |
|---|---|---|---|
| `clipCount` | `number` | — | `client/src/utils/micGrading.ts:193` |
| `nearClipCount` | `number` | — | `client/src/utils/micGrading.ts:194` |
| `hasSignal` | `boolean` | — | `client/src/utils/micGrading.ts:195` |

### `client/src/utils/micTrajectory.SparkPoint` — interface — `client/src/utils/micTrajectory.ts:35-38`

| field | type | default | at |
|---|---|---|---|
| `t` | `number` | — | `client/src/utils/micTrajectory.ts:36` |
| `value` | `number \| null` | — | `client/src/utils/micTrajectory.ts:37` |

### `client/src/utils/micTrajectory.ChangeEvent` — interface — `client/src/utils/micTrajectory.ts:40-45`

| field | type | default | at | note |
|---|---|---|---|---|
| `t` | `number` | — | `client/src/utils/micTrajectory.ts:41` |  |
| `deltaDb` | `number` | — | `client/src/utils/micTrajectory.ts:42` |  |
| `label` | `string` | — | `client/src/utils/micTrajectory.ts:44` | Deliberately "detected" — a marker is a hypothesis, not an attributed cause. |

### `client/src/utils/micTrajectory.TrajectoryReading` — interface — `client/src/utils/micTrajectory.ts:47-54`

| field | type | default | at | note |
|---|---|---|---|---|
| `direction` | `Direction → client/src/utils/micTrajectory.Direction` | — | `client/src/utils/micTrajectory.ts:48` |  |
| `distanceDb` | `number \| null` | — | `client/src/utils/micTrajectory.ts:50` | Signed dB to the target centre. Positive = needs to come up. Null when unmeasurable. |
| `sparkline` | `SparkPoint[] → client/src/utils/micTrajectory.SparkPoint` | — | `client/src/utils/micTrajectory.ts:51` |  |
| `changeEvent` | `ChangeEvent \| null → client/src/utils/micTrajectory.ChangeEvent` | — | `client/src/utils/micTrajectory.ts:53` | Non-null only on the update where a change event is confirmed. |

### `client/src/utils/micTrajectory.PendingStep` — interface — `client/src/utils/micTrajectory.ts:62-67`

| field | type | default | at |
|---|---|---|---|
| `t` | `number` | — | `client/src/utils/micTrajectory.ts:63` |
| `deltaDb` | `number` | — | `client/src/utils/micTrajectory.ts:64` |
| `fromMedian` | `number` | — | `client/src/utils/micTrajectory.ts:65` |
| `toValue` | `number` | — | `client/src/utils/micTrajectory.ts:66` |

### `client/src/utils/micZones.TrackZone` — interface — `client/src/utils/micZones.ts:14-18`

| field | type | default | at |
|---|---|---|---|
| `kind` | `ZoneKind → client/src/utils/micZones.ZoneKind` | — | `client/src/utils/micZones.ts:15` |
| `startPct` | `number` | — | `client/src/utils/micZones.ts:16` |
| `widthPct` | `number` | — | `client/src/utils/micZones.ts:17` |

### `client/src/utils/micZones.TrackSpec` — interface — `client/src/utils/micZones.ts:20-25`

| field | type | default | at |
|---|---|---|---|
| `markerPct` | `number` | — | `client/src/utils/micZones.ts:21` |
| `zones` | `TrackZone[] → client/src/utils/micZones.TrackZone` | — | `client/src/utils/micZones.ts:22` |
| `poleLeft` | `string` | — | `client/src/utils/micZones.ts:23` |
| `poleRight` | `string` | — | `client/src/utils/micZones.ts:24` |

### `client/src/utils/projectFilters.FilterOptions` — interface — `client/src/utils/projectFilters.ts:11-16`

| field | type | default | at |
|---|---|---|---|
| `searchQuery` | `string` | — | `client/src/utils/projectFilters.ts:12` |
| `activeStages` | `Set<string>` | — | `client/src/utils/projectFilters.ts:13` |
| `activePreset` | `string` | — | `client/src/utils/projectFilters.ts:14` |
| `now` | `?: number` | — | `client/src/utils/projectFilters.ts:15` |

### `client/src/utils/srt.SrtEntry` — interface — `client/src/utils/srt.ts:10-15`

A single SRT entry (phrase with timing)

| field | type | default | at |
|---|---|---|---|
| `index` | `number` | — | `client/src/utils/srt.ts:11` |
| `startTime` | `number` | — | `client/src/utils/srt.ts:12` |
| `endTime` | `number` | — | `client/src/utils/srt.ts:13` |
| `text` | `string` | — | `client/src/utils/srt.ts:14` |

### `client/src/utils/srt.TimedWord` — interface — `client/src/utils/srt.ts:20-25`

A word with computed timing (for word-level highlighting)

| field | type | default | at |
|---|---|---|---|
| `word` | `string` | — | `client/src/utils/srt.ts:21` |
| `startTime` | `number` | — | `client/src/utils/srt.ts:22` |
| `endTime` | `number` | — | `client/src/utils/srt.ts:23` |
| `entryIndex` | `number` | — | `client/src/utils/srt.ts:24` |

### `server/src/WatcherManager.WatcherConfig` — interface — `server/src/WatcherManager.ts:19-27`

WatcherManager centralizes all file system watchers.

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `server/src/WatcherManager.ts:20` |
| `pattern` | `string \| string[]` | — | `server/src/WatcherManager.ts:21` |
| `event` | `keyof ServerToClientEvents → shared/types.ServerToClientEvents` | — | `server/src/WatcherManager.ts:22` |
| `debounceMs` | `?: number` | — | `server/src/WatcherManager.ts:23` |
| `depth` | `?: number` | — | `server/src/WatcherManager.ts:24` |
| `ignored` | `?: RegExp` | — | `server/src/WatcherManager.ts:25` |
| `watchEvents` | `?: ('add' \| 'unlink' \| 'change' \| 'addDir' \| 'unlinkDir')[]` | — | `server/src/WatcherManager.ts:26` |

### `server/src/config/env.envSchema` — zod-object — `server/src/config/env.ts:5-13`

| field | type | default | at |
|---|---|---|---|
| `NODE_ENV` | `z.enum(['development', 'production', 'test']).default('development')` | `'development'` | `server/src/config/env.ts:6` |
| `PORT` | `z.coerce.number().int().positive().default(5101)` | `5101` | `server/src/config/env.ts:7` |
| `CLIENT_URL` | `z.string().url().default('http://localhost:5173')` | `'http://localhost:5173'` | `server/src/config/env.ts:8` |
| `YLO_BEARER_TOKEN` | `z.string().optional()` | — | `server/src/config/env.ts:11` |
| `YLO_INBOX_URL` | `z.string().url().optional()` | — | `server/src/config/env.ts:12` |

### `server/src/routes/index.RecentRename` — interface — `server/src/routes/index.ts:52-59`

| field | type | default | at |
|---|---|---|---|
| `id` | `string` | — | `server/src/routes/index.ts:53` |
| `originalPath` | `string` | — | `server/src/routes/index.ts:54` |
| `originalName` | `string` | — | `server/src/routes/index.ts:55` |
| `newPath` | `string` | — | `server/src/routes/index.ts:56` |
| `newName` | `string` | — | `server/src/routes/index.ts:57` |
| `timestamp` | `number` | — | `server/src/routes/index.ts:58` |

### `server/src/routes/query/recordings.UnifiedRecording` — interface — `server/src/routes/query/recordings.ts:20-21`

*extends* `QueryRecording`

*No annotated fields found — this shape declares its fields elsewhere.*

### `server/src/routes/thumbs.ThumbInfo` — interface — `server/src/routes/thumbs.ts:57-63`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `server/src/routes/thumbs.ts:58` |
| `path` | `string` | — | `server/src/routes/thumbs.ts:59` |
| `size` | `number` | — | `server/src/routes/thumbs.ts:60` |
| `timestamp` | `string` | — | `server/src/routes/thumbs.ts:61` |
| `order` | `number` | — | `server/src/routes/thumbs.ts:62` |

### `server/src/routes/thumbs.ZipInfo` — interface — `server/src/routes/thumbs.ts:65-71`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `server/src/routes/thumbs.ts:66` |
| `path` | `string` | — | `server/src/routes/thumbs.ts:67` |
| `size` | `number` | — | `server/src/routes/thumbs.ts:68` |
| `timestamp` | `string` | — | `server/src/routes/thumbs.ts:69` |
| `imageCount` | `number` | — | `server/src/routes/thumbs.ts:70` |

### `server/src/routes/thumbs.ZipImagePreview` — interface — `server/src/routes/thumbs.ts:73-77`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `server/src/routes/thumbs.ts:74` |
| `size` | `number` | — | `server/src/routes/thumbs.ts:75` |
| `dataUrl` | `string` | — | `server/src/routes/thumbs.ts:76` |

### `server/src/scripts/scanProjects.Discrepancy` — interface — `server/src/scripts/scanProjects.ts:33-42`

| field | type | default | at |
|---|---|---|---|
| `projectCode` | `string` | — | `server/src/scripts/scanProjects.ts:34` |
| `projectPath` | `string` | — | `server/src/scripts/scanProjects.ts:35` |
| `type` | `DiscrepancyType → server/src/scripts/scanProjects.DiscrepancyType` | — | `server/src/scripts/scanProjects.ts:36` |
| `severity` | `DiscrepancySeverity → server/src/scripts/scanProjects.DiscrepancySeverity` | — | `server/src/scripts/scanProjects.ts:37` |
| `issue` | `string` | — | `server/src/scripts/scanProjects.ts:38` |
| `file` | `?: string` | — | `server/src/scripts/scanProjects.ts:39` |
| `details` | `?: string` | — | `server/src/scripts/scanProjects.ts:40` |
| `suggestion` | `?: string` | — | `server/src/scripts/scanProjects.ts:41` |

### `server/src/scripts/scanProjects.ProjectScanResult` — interface — `server/src/scripts/scanProjects.ts:44-49`

| field | type | default | at |
|---|---|---|---|
| `projectCode` | `string` | — | `server/src/scripts/scanProjects.ts:45` |
| `projectPath` | `string` | — | `server/src/scripts/scanProjects.ts:46` |
| `fileCount` | `number` | — | `server/src/scripts/scanProjects.ts:47` |
| `discrepancies` | `Discrepancy[] → server/src/scripts/scanProjects.Discrepancy` | — | `server/src/scripts/scanProjects.ts:48` |

### `server/src/scripts/scanProjects.ScanSummary` — interface — `server/src/scripts/scanProjects.ts:51-58`

| field | type | default | at |
|---|---|---|---|
| `scanDate` | `string` | — | `server/src/scripts/scanProjects.ts:52` |
| `projectsScanned` | `number` | — | `server/src/scripts/scanProjects.ts:53` |
| `projectsWithIssues` | `number` | — | `server/src/scripts/scanProjects.ts:54` |
| `totalIssues` | `number` | — | `server/src/scripts/scanProjects.ts:55` |
| `byType` | `Record<DiscrepancyType, number> → server/src/scripts/scanProjects.DiscrepancyType` | — | `server/src/scripts/scanProjects.ts:56` |
| `bySeverity` | `Record<DiscrepancySeverity, number> → server/src/scripts/scanProjects.DiscrepancySeverity` | — | `server/src/scripts/scanProjects.ts:57` |

### `server/src/utils/archiveInventory.BuildArchiveRowOpts` — interface — `server/src/utils/archiveInventory.ts:82-85`

| field | type | default | at |
|---|---|---|---|
| `projectsRoot` | `string` | — | `server/src/utils/archiveInventory.ts:83` |
| `holdingRoot` | `string \| null` | — | `server/src/utils/archiveInventory.ts:84` |

### `server/src/utils/aspectCheck.Size` — interface — `server/src/utils/aspectCheck.ts:18-21`

| field | type | default | at |
|---|---|---|---|
| `width` | `number` | — | `server/src/utils/aspectCheck.ts:19` |
| `height` | `number` | — | `server/src/utils/aspectCheck.ts:20` |

### `server/src/utils/aspectCheck.AspectCheckDeps` — interface — `server/src/utils/aspectCheck.ts:128-132`

| field | type | default | at |
|---|---|---|---|
| `probeFrame` | `(file: string) => Promise<Size \| null> → server/src/utils/aspectCheck.Size` | — | `server/src/utils/aspectCheck.ts:129` |
| `detectPicture` | `(file: string, durationSec?: number) => Promise<Size \| null> → server/src/utils/aspectCheck.Size` | — | `server/src/utils/aspectCheck.ts:130` |
| `now` | `() => Date` | — | `server/src/utils/aspectCheck.ts:131` |

### `server/src/utils/brands.BrandInfo` — interface — `server/src/utils/brands.ts:13-21`

| field | type | default | at |
|---|---|---|---|
| `key` | `string` | — | `server/src/utils/brands.ts:14` |
| `name` | `string` | — | `server/src/utils/brands.ts:15` |
| `root` | `string` | — | `server/src/utils/brands.ts:16` |
| `publishedPath` | `string \| null` | — | `server/src/utils/brands.ts:17` |
| `holdingPath` | `string \| null` | — | `server/src/utils/brands.ts:18` |
| `source` | `'brands.json' \| 'disk'` | — | `server/src/utils/brands.ts:19` |
| `active` | `boolean` | — | `server/src/utils/brands.ts:20` |

### `server/src/utils/brands.BrandsFileEntry` — interface — `server/src/utils/brands.ts:23-26`

| field | type | default | at |
|---|---|---|---|
| `name` | `?: string` | — | `server/src/utils/brands.ts:24` |
| `locations` | `?: { video_projects?: string; ssd_backup?: string }` | — | `server/src/utils/brands.ts:25` |

### `server/src/utils/brands.BrandsFileEntry.locations` — type — `server/src/utils/brands.ts:25`

| field | type | default | at |
|---|---|---|---|
| `video_projects` | `?: string` | — | `server/src/utils/brands.ts:25` |
| `ssd_backup` | `?: string` | — | `server/src/utils/brands.ts:25` |

### `server/src/utils/chapterExtraction.SrtSegment` — interface — `server/src/utils/chapterExtraction.ts:31-37`

| field | type | default | at |
|---|---|---|---|
| `index` | `number` | — | `server/src/utils/chapterExtraction.ts:32` |
| `startSeconds` | `number` | — | `server/src/utils/chapterExtraction.ts:33` |
| `endSeconds` | `number` | — | `server/src/utils/chapterExtraction.ts:34` |
| `startTimestamp` | `string` | — | `server/src/utils/chapterExtraction.ts:35` |
| `text` | `string` | — | `server/src/utils/chapterExtraction.ts:36` |

### `server/src/utils/chapterExtraction.ChapterInfo` — interface — `server/src/utils/chapterExtraction.ts:40-46`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `number` | — | `server/src/utils/chapterExtraction.ts:41` |
| `sequence` | `number` | — | `server/src/utils/chapterExtraction.ts:42` |
| `name` | `string` | — | `server/src/utils/chapterExtraction.ts:43` |
| `transcriptPath` | `string` | — | `server/src/utils/chapterExtraction.ts:44` |
| `fileIndex` | `number` | — | `server/src/utils/chapterExtraction.ts:45` |

### `server/src/utils/chapterExtraction.MatchResult` — interface — `server/src/utils/chapterExtraction.ts:264-271`

| field | type | default | at |
|---|---|---|---|
| `segmentIndex` | `number` | — | `server/src/utils/chapterExtraction.ts:265` |
| `matchType` | `'exact_phrase' \| 'partial_words' \| 'similarity'` | — | `server/src/utils/chapterExtraction.ts:266` |
| `wordCount` | `number` | — | `server/src/utils/chapterExtraction.ts:267` |
| `wordsSkipped` | `number` | — | `server/src/utils/chapterExtraction.ts:268` |
| `similarityScore` | `?: number` | — | `server/src/utils/chapterExtraction.ts:269` |
| `similarityMethod` | `?: string` | — | `server/src/utils/chapterExtraction.ts:270` |

### `server/src/utils/chapterExtraction.InternalChapterResult` — interface — `server/src/utils/chapterExtraction.ts:549-553`

*extends* `ChapterMatch`

| field | type | default | at |
|---|---|---|---|
| `segmentIndex` | `?: number` | — | `server/src/utils/chapterExtraction.ts:550` |
| `transcriptText` | `?: string` | — | `server/src/utils/chapterExtraction.ts:551` |
| `matchResultInternal` | `?: MatchResult → server/src/utils/chapterExtraction.MatchResult` | — | `server/src/utils/chapterExtraction.ts:552` |

### `server/src/utils/chapterRecording.SegmentInfo` — interface — `server/src/utils/chapterRecording.ts:14-21`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `server/src/utils/chapterRecording.ts:15` |
| `path` | `string` | — | `server/src/utils/chapterRecording.ts:16` |
| `sequence` | `number` | — | `server/src/utils/chapterRecording.ts:17` |
| `label` | `string` | — | `server/src/utils/chapterRecording.ts:18` |
| `tags` | `string[]` | — | `server/src/utils/chapterRecording.ts:19` |
| `duration` | `number` | — | `server/src/utils/chapterRecording.ts:20` |

### `server/src/utils/chapterRecording.ChapterSegments` — interface — `server/src/utils/chapterRecording.ts:23-28`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `server/src/utils/chapterRecording.ts:24` |
| `label` | `string` | — | `server/src/utils/chapterRecording.ts:25` |
| `segments` | `SegmentInfo[] → server/src/utils/chapterRecording.SegmentInfo` | — | `server/src/utils/chapterRecording.ts:26` |
| `totalDuration` | `number` | — | `server/src/utils/chapterRecording.ts:27` |

### `server/src/utils/diskUtils.NodeDirent` — type — `server/src/utils/diskUtils.ts:39`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `server/src/utils/diskUtils.ts:39` |
| `isFile` | `(): boolean` | — | `server/src/utils/diskUtils.ts:39` |
| `parentPath` | `?: string` | — | `server/src/utils/diskUtils.ts:39` |
| `path` | `?: string` | — | `server/src/utils/diskUtils.ts:39` |

### `server/src/utils/finalMedia.FinalVideoInfo` — interface — `server/src/utils/finalMedia.ts:19-25`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `server/src/utils/finalMedia.ts:20` |
| `filename` | `string` | — | `server/src/utils/finalMedia.ts:21` |
| `size` | `number` | — | `server/src/utils/finalMedia.ts:22` |
| `version` | `?: number` | — | `server/src/utils/finalMedia.ts:23` |
| `location` | `FinalMediaLocation → server/src/utils/finalMedia.FinalMediaLocation` | — | `server/src/utils/finalMedia.ts:24` |

### `server/src/utils/finalMedia.FinalSrtInfo` — interface — `server/src/utils/finalMedia.ts:27-32`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `server/src/utils/finalMedia.ts:28` |
| `filename` | `string` | — | `server/src/utils/finalMedia.ts:29` |
| `size` | `number` | — | `server/src/utils/finalMedia.ts:30` |
| `location` | `FinalMediaLocation → server/src/utils/finalMedia.FinalMediaLocation` | — | `server/src/utils/finalMedia.ts:31` |

### `server/src/utils/finalMedia.AdditionalSegment` — interface — `server/src/utils/finalMedia.ts:34-38`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `server/src/utils/finalMedia.ts:35` |
| `size` | `number` | — | `server/src/utils/finalMedia.ts:36` |
| `hasSrt` | `boolean` | — | `server/src/utils/finalMedia.ts:37` |

### `server/src/utils/finalMedia.FinalMediaResponse` — interface — `server/src/utils/finalMedia.ts:40-45`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `server/src/utils/finalMedia.ts:41` |
| `video` | `?: FinalVideoInfo → server/src/utils/finalMedia.FinalVideoInfo` | — | `server/src/utils/finalMedia.ts:42` |
| `srt` | `?: FinalSrtInfo → server/src/utils/finalMedia.FinalSrtInfo` | — | `server/src/utils/finalMedia.ts:43` |
| `additionalSegments` | `?: AdditionalSegment[] → server/src/utils/finalMedia.AdditionalSegment` | — | `server/src/utils/finalMedia.ts:44` |

### `server/src/utils/micCheckStore.StartSessionInput` — interface — `server/src/utils/micCheckStore.ts:57-62`

| field | type | default | at |
|---|---|---|---|
| `device` | `MicCheckDevice → shared/types.MicCheckDevice` | — | `server/src/utils/micCheckStore.ts:58` |
| `projectCode` | `?: string \| null` | — | `server/src/utils/micCheckStore.ts:59` |
| `workletVersion` | `?: string \| null` | — | `server/src/utils/micCheckStore.ts:60` |
| `constraints` | `?: MicCheckSession['constraints'] → shared/types.MicCheckSession` | — | `server/src/utils/micCheckStore.ts:61` |

### `server/src/utils/micCheckStore.FinishSessionInput` — interface — `server/src/utils/micCheckStore.ts:264-270`

| field | type | default | at | note |
|---|---|---|---|---|
| `sessionId` | `string` | — | `server/src/utils/micCheckStore.ts:265` |  |
| `probe` | `?: MicCheckSession['probe'] → shared/types.MicCheckSession` | — | `server/src/utils/micCheckStore.ts:266` |  |
| `constraints` | `?: MicCheckSession['constraints'] → shared/types.MicCheckSession` | — | `server/src/utils/micCheckStore.ts:267` |  |
| `notMeasured` | `?: MicCheckNotMeasured[] → shared/types.MicCheckNotMeasured` | — | `server/src/utils/micCheckStore.ts:269` | Extra caller-supplied not-measured entries, merged with the derived ones. |

### `server/src/utils/nextProjectCode.SeriesCode` — interface — `server/src/utils/nextProjectCode.ts:21-24`

| field | type | default | at |
|---|---|---|---|
| `letter` | `string` | — | `server/src/utils/nextProjectCode.ts:22` |
| `num` | `number` | — | `server/src/utils/nextProjectCode.ts:23` |

### `server/src/utils/nextProjectCode.NextCodeResult` — interface — `server/src/utils/nextProjectCode.ts:71-79`

| field | type | default | at |
|---|---|---|---|
| `state` | `'ok' \| 'empty' \| 'unreadable' \| 'exhausted'` | — | `server/src/utils/nextProjectCode.ts:72` |
| `next` | `string \| null` | — | `server/src/utils/nextProjectCode.ts:73` |
| `highest` | `string \| null` | — | `server/src/utils/nextProjectCode.ts:74` |
| `root` | `string` | — | `server/src/utils/nextProjectCode.ts:75` |
| `reason` | `?: string` | — | `server/src/utils/nextProjectCode.ts:76` |
| `seeded` | `?: boolean` | — | `server/src/utils/nextProjectCode.ts:77` |
| `raisesMark` | `?: boolean` | — | `server/src/utils/nextProjectCode.ts:78` |

### `server/src/utils/openContext.ContextDeps` — interface — `server/src/utils/openContext.ts:46-55`

| field | type | default | at | note |
|---|---|---|---|---|
| `getConfig` | `() => Config → shared/types.Config` | — | `server/src/utils/openContext.ts:47` |  |
| `updateConfig` | `(patch: Partial<Config>) => Config → shared/types.Config` | — | `server/src/utils/openContext.ts:48` |  |
| `emit` | `?: (event: 'projects:changed' \| 'recordings:changed' \| 'context:changed', data?: OpenContextState) => void → shared/contextSchemas.OpenContextState` | — | `server/src/utils/openContext.ts:49` |  |
| `home` | `?: string` | — | `server/src/utils/openContext.ts:51` | Home for brands.json, ~/.fli/machine.json and the A5 rewrite. Default os.homedir(). |
| `launchStampPath` | `?: string` | — | `server/src/utils/openContext.ts:53` | File remembering the last applied launch id. Omit to always apply. |
| `log` | `?: (line: string) => void` | — | `server/src/utils/openContext.ts:54` |  |

### `server/src/utils/openContext.ApplyResult` — type-union on `kind` — `server/src/utils/openContext.ts:57-60`

| variant | shape | default | at |
|---|---|---|---|
| `applied` | `{ kind: 'applied'; state: OpenContextState }` | — | `server/src/utils/openContext.ts:58` |
| `missing` | `{ kind: 'missing'; missing: OpenContextArg[] }` | — | `server/src/utils/openContext.ts:59` |
| `refused` | `{ kind: 'refused'; status: 400 \| 404 \| 409 \| 503; refusal: ContextRefusal }` | — | `server/src/utils/openContext.ts:60` |

### `server/src/utils/openContext.ApplyResult[kind=applied]` — type — `server/src/utils/openContext.ts:58`

| field | type | default | at |
|---|---|---|---|
| `kind` | `'applied'` | — | `server/src/utils/openContext.ts:58` |
| `state` | `OpenContextState → shared/contextSchemas.OpenContextState` | — | `server/src/utils/openContext.ts:58` |

### `server/src/utils/openContext.ApplyResult[kind=missing]` — type — `server/src/utils/openContext.ts:59`

| field | type | default | at |
|---|---|---|---|
| `kind` | `'missing'` | — | `server/src/utils/openContext.ts:59` |
| `missing` | `OpenContextArg[] → shared/contextSchemas.OpenContextArg` | — | `server/src/utils/openContext.ts:59` |

### `server/src/utils/openContext.ApplyResult[kind=refused]` — type — `server/src/utils/openContext.ts:60`

| field | type | default | at |
|---|---|---|---|
| `kind` | `'refused'` | — | `server/src/utils/openContext.ts:60` |
| `status` | `400 \| 404 \| 409 \| 503` | — | `server/src/utils/openContext.ts:60` |
| `refusal` | `ContextRefusal → shared/contextSchemas.ContextRefusal` | — | `server/src/utils/openContext.ts:60` |

### `server/src/utils/openContext.Resolution` — type-union on `kind` — `server/src/utils/openContext.ts:64-66`

| variant | shape | default | at |
|---|---|---|---|
| `resolved` | `{ kind: 'resolved'; brand: Brand; root: string; project: string \| null }` | — | `server/src/utils/openContext.ts:65` |
| `refused` | `{ kind: 'refused'; status: 400 \| 404 \| 409 \| 503; refusal: ContextRefusal }` | — | `server/src/utils/openContext.ts:66` |

### `server/src/utils/openContext.Resolution[kind=resolved]` — type — `server/src/utils/openContext.ts:65`

| field | type | default | at |
|---|---|---|---|
| `kind` | `'resolved'` | — | `server/src/utils/openContext.ts:65` |
| `brand` | `Brand → Brand (@flivideo/core)` | — | `server/src/utils/openContext.ts:65` |
| `root` | `string` | — | `server/src/utils/openContext.ts:65` |
| `project` | `string \| null` | — | `server/src/utils/openContext.ts:65` |

### `server/src/utils/openContext.Resolution[kind=refused]` — type — `server/src/utils/openContext.ts:66`

| field | type | default | at |
|---|---|---|---|
| `kind` | `'refused'` | — | `server/src/utils/openContext.ts:66` |
| `status` | `400 \| 404 \| 409 \| 503` | — | `server/src/utils/openContext.ts:66` |
| `refusal` | `ContextRefusal → shared/contextSchemas.ContextRefusal` | — | `server/src/utils/openContext.ts:66` |

### `server/src/utils/projectStats.ProjectStatsRaw` — interface — `server/src/utils/projectStats.ts:51-94`

Raw project stats - the core data before formatting for specific APIs

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `server/src/utils/projectStats.ts:52` |
| `projectPath` | `string` | — | `server/src/utils/projectStats.ts:53` |
| `ships` | `import('../../../shared/types.js').ProjectShips → shared/types.ProjectShips` | — | `server/src/utils/projectStats.ts:55` |
| `shipsDeclared` | `boolean` | — | `server/src/utils/projectStats.ts:56` |
| `totalFiles` | `number` | — | `server/src/utils/projectStats.ts:59` |
| `chapterCount` | `number` | — | `server/src/utils/projectStats.ts:60` |
| `transcriptSync` | `TranscriptSyncStatus → shared/types.TranscriptSyncStatus` | — | `server/src/utils/projectStats.ts:63` |
| `transcriptPercent` | `number` | — | `server/src/utils/projectStats.ts:64` |
| `imageCount` | `number` | — | `server/src/utils/projectStats.ts:67` |
| `thumbCount` | `number` | — | `server/src/utils/projectStats.ts:68` |
| `createdAt` | `string \| null` | — | `server/src/utils/projectStats.ts:71` |
| `lastModified` | `string \| null` | — | `server/src/utils/projectStats.ts:72` |
| `stage` | `ProjectStage → shared/types.ProjectStage` | — | `server/src/utils/projectStats.ts:75` |
| `priority` | `ProjectPriority → shared/types.ProjectPriority` | — | `server/src/utils/projectStats.ts:76` |
| `hasInbox` | `boolean` | — | `server/src/utils/projectStats.ts:79` |
| `hasAssets` | `boolean` | — | `server/src/utils/projectStats.ts:80` |
| `hasChapters` | `boolean` | — | `server/src/utils/projectStats.ts:81` |
| `inboxCount` | `number` | — | `server/src/utils/projectStats.ts:82` |
| `chapterVideoCount` | `number` | — | `server/src/utils/projectStats.ts:83` |
| `hasFinal` | `boolean` | — | `server/src/utils/projectStats.ts:87` |
| `finalMedia` | `?: { video?: { filename: string; size: number }; srt?: { filename: string }; } \| null` | — | `server/src/utils/projectStats.ts:90` |

### `server/src/utils/projectStats.GetProjectStatsOptions` — interface — `server/src/utils/projectStats.ts:99-101`

Options for computing project stats

| field | type | default | at |
|---|---|---|---|
| `includeFinalMedia` | `?: boolean` | — | `server/src/utils/projectStats.ts:100` |

### `server/src/utils/recordingArtifacts.RecordingArtifact` — interface — `server/src/utils/recordingArtifacts.ts:16-25`

| field | type | default | at | note |
|---|---|---|---|---|
| `kind` | `ArtifactKind → server/src/utils/recordingArtifacts.ArtifactKind` | — | `server/src/utils/recordingArtifacts.ts:17` |  |
| `label` | `string` | — | `server/src/utils/recordingArtifacts.ts:19` | Human-facing label for the confirmation dialog, e.g. "Transcript (.srt)" |
| `path` | `string` | — | `server/src/utils/recordingArtifacts.ts:21` | Absolute path on disk |
| `filename` | `string` | — | `server/src/utils/recordingArtifacts.ts:23` | Basename, used as the destination name inside -trash/ |
| `size` | `number` | — | `server/src/utils/recordingArtifacts.ts:24` |  |

### `server/src/utils/reporters.ProjectSummary` — interface — `server/src/utils/reporters.ts:26-40`

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `server/src/utils/reporters.ts:27` |
| `stage` | `string` | — | `server/src/utils/reporters.ts:28` |
| `priority` | `string` | — | `server/src/utils/reporters.ts:29` |
| `ships` | `?: string` | — | `server/src/utils/reporters.ts:30` |
| `shipsDeclared` | `?: boolean` | — | `server/src/utils/reporters.ts:31` |
| `stats` | `{ recordings: number; chapters: number; transcriptPercent: number; images: number; thumbs: number; }` | — | `server/src/utils/reporters.ts:32` |
| `lastModified` | `string \| null` | — | `server/src/utils/reporters.ts:39` |

### `server/src/utils/reporters.ProjectSummary.stats` — type — `server/src/utils/reporters.ts:32-38`

| field | type | default | at |
|---|---|---|---|
| `recordings` | `number` | — | `server/src/utils/reporters.ts:33` |
| `chapters` | `number` | — | `server/src/utils/reporters.ts:34` |
| `transcriptPercent` | `number` | — | `server/src/utils/reporters.ts:35` |
| `images` | `number` | — | `server/src/utils/reporters.ts:36` |
| `thumbs` | `number` | — | `server/src/utils/reporters.ts:37` |

### `server/src/utils/reporters.ProjectDetail` — interface — `server/src/utils/reporters.ts:43-69`

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `server/src/utils/reporters.ts:44` |
| `title` | `?: string` | — | `server/src/utils/reporters.ts:45` |
| `ships` | `?: string` | — | `server/src/utils/reporters.ts:46` |
| `shipsDeclared` | `?: boolean` | — | `server/src/utils/reporters.ts:47` |
| `path` | `string` | — | `server/src/utils/reporters.ts:48` |
| `stage` | `string` | — | `server/src/utils/reporters.ts:49` |
| `priority` | `string` | — | `server/src/utils/reporters.ts:50` |
| `stats` | `{ recordings: number; chapters: number; transcripts: { matched: number; missing: number; orphaned: number; }; images: number; thumbs: numbe…` | — | `server/src/utils/reporters.ts:51` |
| `finalMedia` | `{ video?: { filename: string; size: number }; srt?: { filename: string }; } \| null` | — | `server/src/utils/reporters.ts:63` |
| `createdAt` | `string \| null` | — | `server/src/utils/reporters.ts:67` |
| `lastModified` | `string \| null` | — | `server/src/utils/reporters.ts:68` |

### `server/src/utils/reporters.ProjectDetail.stats` — type — `server/src/utils/reporters.ts:51-62`

| field | type | default | at |
|---|---|---|---|
| `recordings` | `number` | — | `server/src/utils/reporters.ts:52` |
| `chapters` | `number` | — | `server/src/utils/reporters.ts:53` |
| `transcripts` | `{ matched: number; missing: number; orphaned: number; }` | — | `server/src/utils/reporters.ts:54` |
| `images` | `number` | — | `server/src/utils/reporters.ts:59` |
| `thumbs` | `number` | — | `server/src/utils/reporters.ts:60` |
| `totalDuration` | `number \| null` | — | `server/src/utils/reporters.ts:61` |

### `server/src/utils/reporters.ProjectDetail.stats.transcripts` — type — `server/src/utils/reporters.ts:54-58`

| field | type | default | at |
|---|---|---|---|
| `matched` | `number` | — | `server/src/utils/reporters.ts:55` |
| `missing` | `number` | — | `server/src/utils/reporters.ts:56` |
| `orphaned` | `number` | — | `server/src/utils/reporters.ts:57` |

### `server/src/utils/reporters.Recording` — interface — `server/src/utils/reporters.ts:71-81`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `server/src/utils/reporters.ts:72` |
| `chapter` | `string` | — | `server/src/utils/reporters.ts:73` |
| `sequence` | `string` | — | `server/src/utils/reporters.ts:74` |
| `name` | `string` | — | `server/src/utils/reporters.ts:75` |
| `tags` | `string[]` | — | `server/src/utils/reporters.ts:76` |
| `folder` | `'recordings' \| 'safe'` | — | `server/src/utils/reporters.ts:77` |
| `size` | `number` | — | `server/src/utils/reporters.ts:78` |
| `duration` | `number \| null` | — | `server/src/utils/reporters.ts:79` |
| `hasTranscript` | `boolean` | — | `server/src/utils/reporters.ts:80` |

### `server/src/utils/reporters.Transcript` — interface — `server/src/utils/reporters.ts:83-91`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `server/src/utils/reporters.ts:84` |
| `chapter` | `string` | — | `server/src/utils/reporters.ts:85` |
| `sequence` | `string` | — | `server/src/utils/reporters.ts:86` |
| `name` | `string` | — | `server/src/utils/reporters.ts:87` |
| `size` | `number` | — | `server/src/utils/reporters.ts:88` |
| `preview` | `?: string` | — | `server/src/utils/reporters.ts:89` |
| `content` | `?: string` | — | `server/src/utils/reporters.ts:90` |

### `server/src/utils/reporters.Chapter` — interface — `server/src/utils/reporters.ts:93-101`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `number` | — | `server/src/utils/reporters.ts:94` |
| `name` | `string` | — | `server/src/utils/reporters.ts:95` |
| `displayName` | `string` | — | `server/src/utils/reporters.ts:96` |
| `timestamp` | `string \| null` | — | `server/src/utils/reporters.ts:97` |
| `timestampSeconds` | `number \| null` | — | `server/src/utils/reporters.ts:98` |
| `recordingCount` | `number` | — | `server/src/utils/reporters.ts:99` |
| `hasTranscript` | `boolean` | — | `server/src/utils/reporters.ts:100` |

### `server/src/utils/reporters.Image` — interface — `server/src/utils/reporters.ts:103-111`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `server/src/utils/reporters.ts:104` |
| `chapter` | `string` | — | `server/src/utils/reporters.ts:105` |
| `sequence` | `string` | — | `server/src/utils/reporters.ts:106` |
| `imageOrder` | `string` | — | `server/src/utils/reporters.ts:107` |
| `variant` | `string \| null` | — | `server/src/utils/reporters.ts:108` |
| `label` | `string` | — | `server/src/utils/reporters.ts:109` |
| `size` | `number` | — | `server/src/utils/reporters.ts:110` |

### `server/src/utils/reporters.ExportData` — interface — `server/src/utils/reporters.ts:406-413`

| field | type | default | at |
|---|---|---|---|
| `exportedAt` | `?: string` | — | `server/src/utils/reporters.ts:407` |
| `project` | `?: ProjectDetail → server/src/utils/reporters.ProjectDetail` | — | `server/src/utils/reporters.ts:408` |
| `recordings` | `?: Recording[] → server/src/utils/reporters.Recording` | — | `server/src/utils/reporters.ts:409` |
| `transcripts` | `?: Transcript[] → server/src/utils/reporters.Transcript` | — | `server/src/utils/reporters.ts:410` |
| `chapters` | `?: Chapter[] → server/src/utils/reporters.Chapter` | — | `server/src/utils/reporters.ts:411` |
| `images` | `?: Image[] → server/src/utils/reporters.Image` | — | `server/src/utils/reporters.ts:412` |

### `server/src/utils/responses.ErrorResponse` — interface — `server/src/utils/responses.ts:14-17`

Standard error response format

| field | type | default | at |
|---|---|---|---|
| `success` | `false` | — | `server/src/utils/responses.ts:15` |
| `error` | `string` | — | `server/src/utils/responses.ts:16` |

### `server/src/utils/s3Utils.MigrationActions` — interface — `server/src/utils/s3Utils.ts:8-13`

| field | type | default | at |
|---|---|---|---|
| `delete` | `string[]` | — | `server/src/utils/s3Utils.ts:9` |
| `toPrep` | `Array<{ from: string; to: string }>` | — | `server/src/utils/s3Utils.ts:10` |
| `toPost` | `Array<{ from: string; to: string }>` | — | `server/src/utils/s3Utils.ts:11` |
| `conflicts` | `Array<{ file: string; reason: string }>` | — | `server/src/utils/s3Utils.ts:12` |

### `server/src/utils/safeDelete.SafeDeleteRule` — interface — `server/src/utils/safeDelete.ts:8-12`

| field | type | default | at |
|---|---|---|---|
| `rootDir` | `string` | — | `server/src/utils/safeDelete.ts:9` |
| `allowedSuffix` | `string` | — | `server/src/utils/safeDelete.ts:10` |
| `description` | `string` | — | `server/src/utils/safeDelete.ts:11` |

### `server/src/utils/safeDelete.SafeDeleteResult` — interface — `server/src/utils/safeDelete.ts:14-18`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `server/src/utils/safeDelete.ts:15` |
| `deleted` | `Array<{ name: string; size: number }>` | — | `server/src/utils/safeDelete.ts:16` |
| `error` | `?: string` | — | `server/src/utils/safeDelete.ts:17` |

### `server/src/utils/safeMigration.MigrationResult` — interface — `server/src/utils/safeMigration.ts:16-20`

| field | type | default | at |
|---|---|---|---|
| `migrated` | `number` | — | `server/src/utils/safeMigration.ts:17` |
| `errors` | `string[]` | — | `server/src/utils/safeMigration.ts:18` |
| `skipped` | `string[]` | — | `server/src/utils/safeMigration.ts:19` |

### `server/src/utils/scanning.ProjectTimestamps` — interface — `server/src/utils/scanning.ts:86-89`

Project timestamp result

| field | type | default | at |
|---|---|---|---|
| `createdAt` | `string \| null` | — | `server/src/utils/scanning.ts:87` |
| `lastModified` | `string \| null` | — | `server/src/utils/scanning.ts:88` |

### `server/src/utils/scanning.ProjectIndicators` — interface — `server/src/utils/scanning.ts:156-162`

FR-80/FR-82: Project content indicators with counts

| field | type | default | at |
|---|---|---|---|
| `hasInbox` | `boolean` | — | `server/src/utils/scanning.ts:157` |
| `hasAssets` | `boolean` | — | `server/src/utils/scanning.ts:158` |
| `hasChapters` | `boolean` | — | `server/src/utils/scanning.ts:159` |
| `inboxCount` | `number` | — | `server/src/utils/scanning.ts:160` |
| `chapterVideoCount` | `number` | — | `server/src/utils/scanning.ts:161` |

### `server/src/utils/storageActivityLog.ReadStorageActivityOpts` — interface — `server/src/utils/storageActivityLog.ts:40-44`

| field | type | default | at |
|---|---|---|---|
| `projectCode` | `?: string` | — | `server/src/utils/storageActivityLog.ts:41` |
| `limit` | `?: number` | — | `server/src/utils/storageActivityLog.ts:42` |
| `logPath` | `?: string` | — | `server/src/utils/storageActivityLog.ts:43` |

### `server/src/utils/storageTree.GetStorageTreeOpts` — interface — `server/src/utils/storageTree.ts:221-225`

| field | type | default | at |
|---|---|---|---|
| `projectsRoot` | `string` | — | `server/src/utils/storageTree.ts:222` |
| `holdingRoot` | `string \| null` | — | `server/src/utils/storageTree.ts:223` |
| `publishedRoot` | `string \| null` | — | `server/src/utils/storageTree.ts:224` |

### `server/src/utils/telemetry.TranscriptionLogEntry` — interface — `server/src/utils/telemetry.ts:19-31`

| field | type | default | at |
|---|---|---|---|
| `startTimestamp` | `string` | — | `server/src/utils/telemetry.ts:20` |
| `endTimestamp` | `string` | — | `server/src/utils/telemetry.ts:21` |
| `project` | `string` | — | `server/src/utils/telemetry.ts:22` |
| `filename` | `string` | — | `server/src/utils/telemetry.ts:23` |
| `path` | `string` | — | `server/src/utils/telemetry.ts:24` |
| `videoDurationSec` | `number` | — | `server/src/utils/telemetry.ts:25` |
| `transcriptionDurationSec` | `number` | — | `server/src/utils/telemetry.ts:26` |
| `ratio` | `number` | — | `server/src/utils/telemetry.ts:27` |
| `fileSizeBytes` | `number` | — | `server/src/utils/telemetry.ts:28` |
| `model` | `string` | — | `server/src/utils/telemetry.ts:29` |
| `success` | `boolean` | — | `server/src/utils/telemetry.ts:30` |

### `shared/apiRegistry.ApiParameter` — interface — `shared/apiRegistry.ts:10-20`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `shared/apiRegistry.ts:11` |
| `type` | `ParameterType → shared/apiRegistry.ParameterType` | — | `shared/apiRegistry.ts:12` |
| `dataType` | `DataType → shared/apiRegistry.DataType` | — | `shared/apiRegistry.ts:13` |
| `description` | `?: string` | — | `shared/apiRegistry.ts:14` |
| `required` | `?: boolean` | — | `shared/apiRegistry.ts:15` |
| `enum` | `?: string[]` | — | `shared/apiRegistry.ts:16` |
| `example` | `?: any` | — | `shared/apiRegistry.ts:18` |
| `properties` | `?: ApiParameter[] → shared/apiRegistry.ApiParameter` | — | `shared/apiRegistry.ts:19` |

### `shared/apiRegistry.ApiEndpoint` — interface — `shared/apiRegistry.ts:22-32`

| field | type | default | at |
|---|---|---|---|
| `id` | `string` | — | `shared/apiRegistry.ts:23` |
| `method` | `HttpMethod → shared/apiRegistry.HttpMethod` | — | `shared/apiRegistry.ts:24` |
| `path` | `string` | — | `shared/apiRegistry.ts:25` |
| `group` | `string` | — | `shared/apiRegistry.ts:26` |
| `description` | `string` | — | `shared/apiRegistry.ts:27` |
| `parameters` | `ApiParameter[] → shared/apiRegistry.ApiParameter` | — | `shared/apiRegistry.ts:28` |
| `exampleResponse` | `?: any` | — | `shared/apiRegistry.ts:30` |
| `notes` | `?: string` | — | `shared/apiRegistry.ts:31` |

### `shared/contextSchemas.NonEmpty` — zod-scalar — `shared/contextSchemas.ts:9`

`z.string().min(1)`

### `shared/contextSchemas.HubContextSchema` — zod-object — `shared/contextSchemas.ts:18-26`

*aliases* `HubContext` `shared/contextSchemas.ts:27`

| field | type | default | at |
|---|---|---|---|
| `brand` | `NonEmpty → shared/contextSchemas.NonEmpty` | — | `shared/contextSchemas.ts:19` |
| `root` | `NonEmpty → shared/contextSchemas.NonEmpty` | — | `shared/contextSchemas.ts:20` |
| `project` | `NonEmpty → shared/contextSchemas.NonEmpty` | — | `shared/contextSchemas.ts:21` |
| `projectDir` | `NonEmpty → shared/contextSchemas.NonEmpty` | — | `shared/contextSchemas.ts:22` |
| `projectId` | `z.string().nullable()` | — | `shared/contextSchemas.ts:23` |
| `membership` | `z.enum(['member', 'folder'])` | — | `shared/contextSchemas.ts:24` |
| `video` | `VideoFolderName.optional() → VideoFolderName (@flivideo/core)` | — | `shared/contextSchemas.ts:25` |

### `shared/contextSchemas.ContextRefusalSchema` — zod-object — `shared/contextSchemas.ts:48-52`

*aliases* `ContextRefusal` `shared/contextSchemas.ts:53`

| field | type | default | at |
|---|---|---|---|
| `code` | `z.enum(REFUSAL_CODES) → shared/contextSchemas.REFUSAL_CODES` | — | `shared/contextSchemas.ts:49` |
| `reason` | `z.string()` | — | `shared/contextSchemas.ts:50` |
| `candidates` | `z.array(z.string()).optional()` | — | `shared/contextSchemas.ts:51` |

### `shared/contextSchemas.OpenContextStateSchema` — zod-object — `shared/contextSchemas.ts:55-59`

*aliases* `OpenContextState` `shared/contextSchemas.ts:60`

| field | type | default | at |
|---|---|---|---|
| `context` | `HubContextSchema.nullable() → shared/contextSchemas.HubContextSchema` | — | `shared/contextSchemas.ts:56` |
| `missing` | `z.array(OpenContextArgSchema) → shared/contextSchemas.OpenContextArgSchema` | — | `shared/contextSchemas.ts:57` |
| `refused` | `ContextRefusalSchema.optional() → shared/contextSchemas.ContextRefusalSchema` | — | `shared/contextSchemas.ts:58` |

### `shared/naming.ParsedRecording` — interface — `shared/naming.ts:127-131`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `shared/naming.ts:128` |
| `sequence` | `string \| null` | — | `shared/naming.ts:129` |
| `name` | `string` | — | `shared/naming.ts:130` |

### `shared/naming.ParsedImageAsset` — interface — `shared/naming.ts:133-139`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `shared/naming.ts:134` |
| `sequence` | `string` | — | `shared/naming.ts:135` |
| `imageOrder` | `string` | — | `shared/naming.ts:136` |
| `variant` | `string \| null` | — | `shared/naming.ts:137` |
| `label` | `string` | — | `shared/naming.ts:138` |

### `shared/naming.ParseOptions` — interface — `shared/naming.ts:148-157`

Options for parsing functions

| field | type | default | at | note |
|---|---|---|---|---|
| `lenient` | `?: boolean` | — | `shared/naming.ts:156` | When true, accepts 1-2 digit chapters (for reading legacy files). |

### `shared/paths.ProjectPaths` — interface — `shared/paths.ts:38-59`

| field | type | default | at |
|---|---|---|---|
| `project` | `string` | — | `shared/paths.ts:39` |
| `layout` | `ProjectLayout → ProjectLayout (@flivideo/core)` | — | `shared/paths.ts:40` |
| `recordings` | `string` | — | `shared/paths.ts:41` |
| `broll` | `string` | — | `shared/paths.ts:42` |
| `safe` | `string` | — | `shared/paths.ts:43` |
| `chapters` | `string` | — | `shared/paths.ts:44` |
| `trash` | `string` | — | `shared/paths.ts:45` |
| `assets` | `string` | — | `shared/paths.ts:46` |
| `images` | `string` | — | `shared/paths.ts:47` |
| `thumbs` | `string` | — | `shared/paths.ts:48` |
| `transcripts` | `string` | — | `shared/paths.ts:49` |
| `final` | `string` | — | `shared/paths.ts:50` |
| `s3Staging` | `string` | — | `shared/paths.ts:51` |
| `inbox` | `string` | — | `shared/paths.ts:53` |
| `inboxRaw` | `string` | — | `shared/paths.ts:54` |
| `inboxDataset` | `string` | — | `shared/paths.ts:55` |
| `inboxPresentation` | `string` | — | `shared/paths.ts:56` |
| `stateFile` | `string` | — | `shared/paths.ts:58` |

### `shared/types.FileInfo` — interface — `shared/types.ts:6-13`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `shared/types.ts:7` |
| `filename` | `string` | — | `shared/types.ts:8` |
| `timestamp` | `string` | — | `shared/types.ts:9` |
| `size` | `number` | — | `shared/types.ts:10` |
| `duration` | `?: number` | — | `shared/types.ts:11` |
| `aspectCheck` | `?: AspectCheck → shared/types.AspectCheck` | — | `shared/types.ts:12` |

### `shared/types.AspectCheck` — interface — `shared/types.ts:19-30`

| field | type | default | at | note |
|---|---|---|---|---|
| `status` | `'ok' \| 'mismatch' \| 'skipped' \| 'unknown'` | — | `shared/types.ts:21` | ok · mismatch (shout) · skipped (project has no aspect set) · unknown (could not probe) |
| `expected` | `?: ProjectAspectValue → shared/types.ProjectAspectValue` | — | `shared/types.ts:22` |  |
| `frame` | `?: { width: number; height: number }` | — | `shared/types.ts:24` | The file's display size (rotation applied). |
| `picture` | `?: { width: number; height: number } \| null` | — | `shared/types.ts:26` | The real picture inside any black bars (ffmpeg cropdetect); null when it could not be read. |
| `message` | `string` | — | `shared/types.ts:28` | Human sentence: what was expected, what arrived, and the fix. |
| `checkedAt` | `string` | — | `shared/types.ts:29` |  |

### `shared/types.AspectCheck.frame` — type — `shared/types.ts:24`

| field | type | default | at |
|---|---|---|---|
| `width` | `number` | — | `shared/types.ts:24` |
| `height` | `number` | — | `shared/types.ts:24` |

### `shared/types.ChapterFilter` — interface — `shared/types.ts:33-36`

| field | type | default | at |
|---|---|---|---|
| `min` | `?: number` | — | `shared/types.ts:34` |
| `max` | `?: number` | — | `shared/types.ts:35` |

### `shared/types.CommonName` — interface — `shared/types.ts:39-44`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `shared/types.ts:40` |
| `autoSequence` | `?: boolean` | — | `shared/types.ts:41` |
| `suggestTags` | `?: string[]` | — | `shared/types.ts:42` |
| `chapterFilter` | `?: 'all' \| ChapterFilter → shared/types.ChapterFilter` | — | `shared/types.ts:43` |

### `shared/types.Config` — interface — `shared/types.ts:46-73`

| field | type | default | at |
|---|---|---|---|
| `watchDirectory` | `string` | — | `shared/types.ts:47` |
| `projectDirectory` | `string` | — | `shared/types.ts:50` |
| `projectsRootDirectory` | `?: string` | — | `shared/types.ts:52` |
| `activeProject` | `?: string` | — | `shared/types.ts:53` |
| `fileExtensions` | `string[]` | — | `shared/types.ts:54` |
| `availableTags` | `string[]` | — | `shared/types.ts:55` |
| `commonNames` | `CommonName[] → shared/types.CommonName` | — | `shared/types.ts:56` |
| `imageSourceDirectory` | `string` | — | `shared/types.ts:57` |
| `projectPriorities` | `?: Record<string, 'pinned'>` | — | `shared/types.ts:58` |
| `projectStageOverrides` | `?: Record<string, ProjectStage> → shared/types.ProjectStage` | — | `shared/types.ts:59` |
| `projectCodeHighWater` | `?: Record<string, string>` | — | `shared/types.ts:60` |
| `projectStages` | `?: ProjectStage[] → shared/types.ProjectStage` | — | `shared/types.ts:61` |
| `chapterRecordings` | `?: ChapterRecordingConfig → shared/types.ChapterRecordingConfig` | — | `shared/types.ts:62` |
| `glingDictionary` | `?: string[]` | — | `shared/types.ts:63` |
| `poemWuiUrl` | `?: string` | — | `shared/types.ts:64` |
| `brandConfigPath` | `?: string` | — | `shared/types.ts:65` |
| `machineRole` | `?: MachineRole → shared/types.MachineRole` | — | `shared/types.ts:66` |
| `diskThresholds` | `?: DiskThresholds → shared/types.DiskThresholds` | — | `shared/types.ts:67` |
| `holdingPath` | `?: string` | — | `shared/types.ts:68` |
| `publishedPath` | `?: string` | — | `shared/types.ts:69` |
| `whisperBinary` | `?: string` | — | `shared/types.ts:70` |
| `whisperModel` | `?: string` | — | `shared/types.ts:71` |
| `whisperLanguage` | `?: string` | — | `shared/types.ts:72` |

### `shared/types.DiskSizeData` — interface — `shared/types.ts:76-91`

| field | type | default | at |
|---|---|---|---|
| `rec` | `number` | — | `shared/types.ts:77` |
| `trash` | `number` | — | `shared/types.ts:78` |
| `other` | `number` | — | `shared/types.ts:79` |
| `total` | `number` | — | `shared/types.ts:80` |
| `calculatedAt` | `string` | — | `shared/types.ts:81` |
| `heldAt` | `?: string` | — | `shared/types.ts:83` |
| `holdingPath` | `?: string` | — | `shared/types.ts:84` |
| `detail` | `?: { other: Record<string, number>; // subfolder name → bytes (e.g. { "final": 38000000, "assets": 1000000 }) recTopFiles: Array<{ name: strin…` | — | `shared/types.ts:86` |

### `shared/types.DiskSizeData.detail` — type — `shared/types.ts:86-90`

| field | type | default | at |
|---|---|---|---|
| `other` | `Record<string, number>` | — | `shared/types.ts:87` |
| `recTopFiles` | `Array<{ name: string; size: number }>` | — | `shared/types.ts:88` |
| `trashFiles` | `Array<{ name: string; size: number }>` | — | `shared/types.ts:89` |

### `shared/types.TrashSummaryResponse` — interface — `shared/types.ts:95-102`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:96` |
| `exists` | `?: boolean` | — | `shared/types.ts:97` |
| `fileCount` | `?: number` | — | `shared/types.ts:98` |
| `totalBytes` | `?: number` | — | `shared/types.ts:99` |
| `nestedCount` | `?: number` | — | `shared/types.ts:100` |
| `error` | `?: string` | — | `shared/types.ts:101` |

### `shared/types.DiskThresholdConfig` — interface — `shared/types.ts:105-109`

| field | type | default | at |
|---|---|---|---|
| `faint` | `string \| null` | — | `shared/types.ts:106` |
| `amber` | `string \| null` | — | `shared/types.ts:107` |
| `red` | `string \| null` | — | `shared/types.ts:108` |

### `shared/types.DiskThresholds` — interface — `shared/types.ts:112-120`

| field | type | default | at |
|---|---|---|---|
| `stagePenaltyMultiplier` | `number` | — | `shared/types.ts:113` |
| `columns` | `{ trash: DiskThresholdConfig; rec: DiskThresholdConfig; other: DiskThresholdConfig; total: DiskThresholdConfig; } → shared/types.DiskThresholdConfig` | — | `shared/types.ts:114` |

### `shared/types.DiskThresholds.columns` — type — `shared/types.ts:114-119`

| field | type | default | at |
|---|---|---|---|
| `trash` | `DiskThresholdConfig → shared/types.DiskThresholdConfig` | — | `shared/types.ts:115` |
| `rec` | `DiskThresholdConfig → shared/types.DiskThresholdConfig` | — | `shared/types.ts:116` |
| `other` | `DiskThresholdConfig → shared/types.DiskThresholdConfig` | — | `shared/types.ts:117` |
| `total` | `DiskThresholdConfig → shared/types.DiskThresholdConfig` | — | `shared/types.ts:118` |

### `shared/types.HoldVerification` — interface — `shared/types.ts:129-135`

| field | type | default | at |
|---|---|---|---|
| `localFiles` | `number` | — | `shared/types.ts:130` |
| `holdingFiles` | `number` | — | `shared/types.ts:131` |
| `localBytes` | `number` | — | `shared/types.ts:132` |
| `holdingBytes` | `number` | — | `shared/types.ts:133` |
| `match` | `boolean` | — | `shared/types.ts:134` |

### `shared/types.HoldStatus` — interface — `shared/types.ts:138-144`

| field | type | default | at |
|---|---|---|---|
| `location` | `HoldLocation → shared/types.HoldLocation` | — | `shared/types.ts:139` |
| `holdingPath` | `?: string` | — | `shared/types.ts:140` |
| `heldAt` | `?: string` | — | `shared/types.ts:141` |
| `ssdMounted` | `boolean` | — | `shared/types.ts:142` |
| `verification` | `?: HoldVerification → shared/types.HoldVerification` | — | `shared/types.ts:143` |

### `shared/types.ArchiveRow` — interface — `shared/types.ts:153-166`

| field | type | default | at |
|---|---|---|---|
| `projectCode` | `string` | — | `shared/types.ts:154` |
| `projectPath` | `string` | — | `shared/types.ts:155` |
| `localBytes` | `number` | — | `shared/types.ts:156` |
| `heldBytes` | `number` | — | `shared/types.ts:157` |
| `held` | `boolean` | — | `shared/types.ts:158` |
| `state` | `ArchiveState → shared/types.ArchiveState` | — | `shared/types.ts:159` |
| `lastTouched` | `string \| null` | — | `shared/types.ts:160` |
| `degraded` | `?: boolean` | — | `shared/types.ts:164` |
| `error` | `?: string` | — | `shared/types.ts:165` |

### `shared/types.ArchiveInventoryResponse` — interface — `shared/types.ts:168-170`

| field | type | default | at |
|---|---|---|---|
| `rows` | `ArchiveRow[] → shared/types.ArchiveRow` | — | `shared/types.ts:169` |

### `shared/types.StorageTreeNode` — interface — `shared/types.ts:181-188`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `shared/types.ts:182` |
| `path` | `string` | — | `shared/types.ts:183` |
| `sizeBytes` | `number` | — | `shared/types.ts:184` |
| `classification` | `StorageClassification → shared/types.StorageClassification` | — | `shared/types.ts:185` |
| `location` | `StorageLocation → shared/types.StorageLocation` | — | `shared/types.ts:186` |
| `children` | `?: StorageTreeNode[] → shared/types.StorageTreeNode` | — | `shared/types.ts:187` |

### `shared/types.StorageTreeSizes` — interface — `shared/types.ts:190-196`

| field | type | default | at |
|---|---|---|---|
| `localTotal` | `number` | — | `shared/types.ts:191` |
| `heavyTotal` | `number` | — | `shared/types.ts:192` |
| `lightTotal` | `number` | — | `shared/types.ts:193` |
| `heldTotal` | `number` | — | `shared/types.ts:194` |
| `archivedTotal` | `number` | — | `shared/types.ts:195` |

### `shared/types.StorageTreePaths` — interface — `shared/types.ts:198-202`

| field | type | default | at |
|---|---|---|---|
| `local` | `string` | — | `shared/types.ts:199` |
| `holding` | `string \| null` | — | `shared/types.ts:200` |
| `published` | `string \| null` | — | `shared/types.ts:201` |

### `shared/types.StorageTreeResponse` — interface — `shared/types.ts:204-212`

| field | type | default | at |
|---|---|---|---|
| `state` | `StorageState → shared/types.StorageState` | — | `shared/types.ts:205` |
| `nodes` | `StorageTreeNode[] → shared/types.StorageTreeNode` | — | `shared/types.ts:206` |
| `sizes` | `StorageTreeSizes → shared/types.StorageTreeSizes` | — | `shared/types.ts:207` |
| `paths` | `StorageTreePaths → shared/types.StorageTreePaths` | — | `shared/types.ts:208` |
| `ssdMounted` | `boolean` | — | `shared/types.ts:209` |
| `degraded` | `?: boolean` | — | `shared/types.ts:210` |
| `error` | `?: string` | — | `shared/types.ts:211` |

### `shared/types.StorageMutationResponse` — interface — `shared/types.ts:220-224`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:221` |
| `error` | `?: string` | — | `shared/types.ts:222` |
| `newState` | `?: StorageState → shared/types.StorageState` | — | `shared/types.ts:223` |

### `shared/types.StorageActivityEntry` — interface — `shared/types.ts:231-236`

| field | type | default | at |
|---|---|---|---|
| `projectCode` | `string` | — | `shared/types.ts:232` |
| `action` | `StorageActivityAction → shared/types.StorageActivityAction` | — | `shared/types.ts:233` |
| `sizeBytes` | `number` | — | `shared/types.ts:234` |
| `timestamp` | `string` | — | `shared/types.ts:235` |

### `shared/types.StorageActivityResponse` — interface — `shared/types.ts:238-242`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:239` |
| `entries` | `StorageActivityEntry[] → shared/types.StorageActivityEntry` | — | `shared/types.ts:240` |
| `error` | `?: string` | — | `shared/types.ts:241` |

### `shared/types.HoldOperationResult` — interface — `shared/types.ts:245-251`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:246` |
| `message` | `string` | — | `shared/types.ts:247` |
| `holdingPath` | `?: string` | — | `shared/types.ts:248` |
| `verification` | `?: HoldVerification → shared/types.HoldVerification` | — | `shared/types.ts:249` |
| `error` | `?: string` | — | `shared/types.ts:250` |

### `shared/types.RenameRequest` — interface — `shared/types.ts:253-260`

| field | type | default | at |
|---|---|---|---|
| `destination` | `?: 'recordings' \| 'b-roll'` | — | `shared/types.ts:254` |
| `originalPath` | `string` | — | `shared/types.ts:255` |
| `chapter` | `string` | — | `shared/types.ts:256` |
| `sequence` | `string \| null` | — | `shared/types.ts:257` |
| `name` | `string` | — | `shared/types.ts:258` |
| `tags` | `string[]` | — | `shared/types.ts:259` |

### `shared/types.RenameResponse` — interface — `shared/types.ts:262-269`

| field | type | default | at | note |
|---|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:263` |  |
| `oldPath` | `string` | — | `shared/types.ts:264` |  |
| `newPath` | `string` | — | `shared/types.ts:265` |  |
| `error` | `?: string` | — | `shared/types.ts:266` |  |
| `aspect` | `?: AspectCheck['status'] \| 'pending' → shared/types.AspectCheck` | — | `shared/types.ts:268` | Aspect check for a promoted recording: its result, or 'pending' when it still runs on the promoted file |

### `shared/types.SuggestedNaming` — interface — `shared/types.ts:275-280`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `shared/types.ts:276` |
| `sequence` | `string` | — | `shared/types.ts:277` |
| `name` | `string` | — | `shared/types.ts:278` |
| `existingFiles` | `string[]` | — | `shared/types.ts:279` |

### `shared/types.ProjectInfo` — interface — `shared/types.ts:283-288`

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `shared/types.ts:284` |
| `path` | `string` | — | `shared/types.ts:285` |
| `fileCount` | `number` | — | `shared/types.ts:286` |
| `lastModified` | `string` | — | `shared/types.ts:287` |

### `shared/types.TranscriptSyncStatus` — interface — `shared/types.ts:338-342`

| field | type | default | at |
|---|---|---|---|
| `matched` | `number` | — | `shared/types.ts:339` |
| `missingTranscripts` | `string[]` | — | `shared/types.ts:340` |
| `orphanedTranscripts` | `string[]` | — | `shared/types.ts:341` |

### `shared/types.TranscriptSyncResponse` — interface — `shared/types.ts:345-351`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:346` |
| `matched` | `string[]` | — | `shared/types.ts:347` |
| `missingTranscripts` | `string[]` | — | `shared/types.ts:348` |
| `orphanedTranscripts` | `string[]` | — | `shared/types.ts:349` |
| `recordingsDir` | `?: string` | — | `shared/types.ts:350` |

### `shared/types.ProjectStats` — interface — `shared/types.ts:353-399`

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `shared/types.ts:354` |
| `path` | `string` | — | `shared/types.ts:355` |
| `priority` | `ProjectPriority → shared/types.ProjectPriority` | — | `shared/types.ts:358` |
| `totalFiles` | `number` | — | `shared/types.ts:361` |
| `chapterCount` | `number` | — | `shared/types.ts:364` |
| `transcriptCount` | `number` | — | `shared/types.ts:367` |
| `transcriptPercent` | `number` | — | `shared/types.ts:368` |
| `transcriptSync` | `{ matched: number; missingCount: number; orphanedCount: number; }` | — | `shared/types.ts:369` |
| `stage` | `ProjectStage → shared/types.ProjectStage` | — | `shared/types.ts:376` |
| `createdAt` | `string \| null` | — | `shared/types.ts:379` |
| `lastModified` | `string \| null` | — | `shared/types.ts:380` |
| `totalDuration` | `number \| null` | — | `shared/types.ts:381` |
| `imageCount` | `number` | — | `shared/types.ts:382` |
| `thumbCount` | `number` | — | `shared/types.ts:383` |
| `hasInbox` | `boolean` | — | `shared/types.ts:386` |
| `hasAssets` | `boolean` | — | `shared/types.ts:387` |
| `hasChapters` | `boolean` | — | `shared/types.ts:388` |
| `ships` | `ProjectShips → shared/types.ProjectShips` | — | `shared/types.ts:392` |
| `shipsDeclared` | `boolean` | — | `shared/types.ts:393` |
| `inboxCount` | `number` | — | `shared/types.ts:394` |
| `chapterVideoCount` | `number` | — | `shared/types.ts:395` |
| `hasFinal` | `boolean` | — | `shared/types.ts:398` |

### `shared/types.ProjectStats.transcriptSync` — type — `shared/types.ts:369-373`

| field | type | default | at |
|---|---|---|---|
| `matched` | `number` | — | `shared/types.ts:370` |
| `missingCount` | `number` | — | `shared/types.ts:371` |
| `orphanedCount` | `number` | — | `shared/types.ts:372` |

### `shared/types.RecordingFile` — interface — `shared/types.ts:402-417`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:403` |
| `path` | `string` | — | `shared/types.ts:404` |
| `size` | `number` | — | `shared/types.ts:405` |
| `timestamp` | `string` | — | `shared/types.ts:406` |
| `duration` | `?: number` | — | `shared/types.ts:407` |
| `chapter` | `string` | — | `shared/types.ts:408` |
| `sequence` | `string` | — | `shared/types.ts:409` |
| `name` | `string` | — | `shared/types.ts:410` |
| `tags` | `string[]` | — | `shared/types.ts:411` |
| `folder` | `'recordings'` | — | `shared/types.ts:412` |
| `isSafe` | `boolean` | — | `shared/types.ts:413` |
| `isParked` | `boolean` | — | `shared/types.ts:414` |
| `annotation` | `?: string` | — | `shared/types.ts:415` |
| `aspectWarning` | `?: AspectCheck → shared/types.AspectCheck` | — | `shared/types.ts:416` |

### `shared/types.ImageInfo` — interface — `shared/types.ts:420-428`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `shared/types.ts:421` |
| `filename` | `string` | — | `shared/types.ts:422` |
| `size` | `number` | — | `shared/types.ts:423` |
| `timestamp` | `string` | — | `shared/types.ts:424` |
| `hash` | `string` | — | `shared/types.ts:425` |
| `isDuplicate` | `?: boolean` | — | `shared/types.ts:426` |
| `duplicateOf` | `?: string` | — | `shared/types.ts:427` |

### `shared/types.ImageAsset` — interface — `shared/types.ts:431-442`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `shared/types.ts:432` |
| `filename` | `string` | — | `shared/types.ts:433` |
| `size` | `number` | — | `shared/types.ts:434` |
| `timestamp` | `string` | — | `shared/types.ts:435` |
| `chapter` | `string` | — | `shared/types.ts:436` |
| `sequence` | `string` | — | `shared/types.ts:437` |
| `imageOrder` | `string` | — | `shared/types.ts:438` |
| `variant` | `string \| null` | — | `shared/types.ts:439` |
| `label` | `string` | — | `shared/types.ts:440` |
| `type` | `?: 'image'` | — | `shared/types.ts:441` |

### `shared/types.AssignImageRequest` — interface — `shared/types.ts:445-452`

| field | type | default | at |
|---|---|---|---|
| `sourcePath` | `string` | — | `shared/types.ts:446` |
| `chapter` | `string` | — | `shared/types.ts:447` |
| `sequence` | `string` | — | `shared/types.ts:448` |
| `imageOrder` | `string` | — | `shared/types.ts:449` |
| `variant` | `string \| null` | — | `shared/types.ts:450` |
| `label` | `string` | — | `shared/types.ts:451` |

### `shared/types.AssignImageResponse` — interface — `shared/types.ts:455-460`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:456` |
| `oldPath` | `string` | — | `shared/types.ts:457` |
| `newPath` | `string` | — | `shared/types.ts:458` |
| `error` | `?: string` | — | `shared/types.ts:459` |

### `shared/types.NextImageOrderResponse` — interface — `shared/types.ts:463-468`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `shared/types.ts:464` |
| `sequence` | `string` | — | `shared/types.ts:465` |
| `nextImageOrder` | `string` | — | `shared/types.ts:466` |
| `existingCount` | `number` | — | `shared/types.ts:467` |

### `shared/types.PromptAsset` — interface — `shared/types.ts:471-484`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `shared/types.ts:472` |
| `filename` | `string` | — | `shared/types.ts:473` |
| `size` | `number` | — | `shared/types.ts:474` |
| `timestamp` | `string` | — | `shared/types.ts:475` |
| `chapter` | `string` | — | `shared/types.ts:476` |
| `sequence` | `string` | — | `shared/types.ts:477` |
| `imageOrder` | `string` | — | `shared/types.ts:478` |
| `variant` | `string \| null` | — | `shared/types.ts:479` |
| `label` | `string` | — | `shared/types.ts:480` |
| `type` | `'prompt'` | — | `shared/types.ts:481` |
| `content` | `?: string` | — | `shared/types.ts:482` |
| `contentPreview` | `?: string` | — | `shared/types.ts:483` |

### `shared/types.SavePromptRequest` — interface — `shared/types.ts:487-494`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `shared/types.ts:488` |
| `sequence` | `string` | — | `shared/types.ts:489` |
| `imageOrder` | `string` | — | `shared/types.ts:490` |
| `variant` | `string \| null` | — | `shared/types.ts:491` |
| `label` | `string` | — | `shared/types.ts:492` |
| `content` | `string` | — | `shared/types.ts:493` |

### `shared/types.SavePromptResponse` — interface — `shared/types.ts:497-504`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:498` |
| `path` | `string` | — | `shared/types.ts:499` |
| `filename` | `string` | — | `shared/types.ts:500` |
| `created` | `boolean` | — | `shared/types.ts:501` |
| `deleted` | `?: boolean` | — | `shared/types.ts:502` |
| `error` | `?: string` | — | `shared/types.ts:503` |

### `shared/types.LoadPromptResponse` — interface — `shared/types.ts:507-515`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:508` |
| `content` | `string` | — | `shared/types.ts:509` |
| `chapter` | `string` | — | `shared/types.ts:510` |
| `sequence` | `string` | — | `shared/types.ts:511` |
| `imageOrder` | `string` | — | `shared/types.ts:512` |
| `variant` | `string \| null` | — | `shared/types.ts:513` |
| `label` | `string` | — | `shared/types.ts:514` |

### `shared/types.ServerToClientEvents` — interface — `shared/types.ts:518-550`

| field | type | default | at |
|---|---|---|---|
| `file:new` | `(file: FileInfo) => void → shared/types.FileInfo` | — | `shared/types.ts:519` |
| `file:deleted` | `(data: { path: string }) => void` | — | `shared/types.ts:520` |
| `file:aspect` | `(data: { path: string; aspectCheck: AspectCheck }) => void → shared/types.AspectCheck` | — | `shared/types.ts:521` |
| `file:renamed` | `(data: { oldPath: string; newPath: string }) => void` | — | `shared/types.ts:522` |
| `file:error` | `(data: { path: string; error: string }) => void` | — | `shared/types.ts:523` |
| `thumbs:changed` | `() => void` | — | `shared/types.ts:525` |
| `thumbs:zip-added` | `() => void` | — | `shared/types.ts:526` |
| `assets:incoming-changed` | `() => void` | — | `shared/types.ts:527` |
| `assets:assigned-changed` | `() => void` | — | `shared/types.ts:528` |
| `recordings:changed` | `() => void` | — | `shared/types.ts:529` |
| `projects:changed` | `() => void` | — | `shared/types.ts:530` |
| `inbox:changed` | `() => void` | — | `shared/types.ts:531` |
| `transcripts:changed` | `() => void` | — | `shared/types.ts:532` |
| `miccheck:started` | `(data: { sessionId: string }) => void` | — | `shared/types.ts:534` |
| `miccheck:tick` | `(data: { sessionId: string; tick: MicCheckTick }) => void → shared/types.MicCheckTick` | — | `shared/types.ts:535` |
| `miccheck:finished` | `(data: { sessionId: string }) => void` | — | `shared/types.ts:536` |
| `transcription:queued` | `(job: { jobId: string; videoPath: string; position: number }) => void` | — | `shared/types.ts:538` |
| `transcription:started` | `(job: { jobId: string; videoPath: string }) => void` | — | `shared/types.ts:539` |
| `transcription:progress` | `(data: { jobId: string; text: string }) => void` | — | `shared/types.ts:540` |
| `transcription:complete` | `(job: { jobId: string; videoPath: string; transcriptPath: string; }) => void` | — | `shared/types.ts:541` |
| `transcription:error` | `(job: { jobId: string; videoPath: string; error: string }) => void` | — | `shared/types.ts:546` |
| `context:changed` | `(data: OpenContextState) => void → shared/contextSchemas.OpenContextState` | — | `shared/types.ts:549` |

### `shared/types.ClientToServerEvents` — interface — `shared/types.ts:562-564`

*No annotated fields found — this shape declares its fields elsewhere.*

### `shared/types.TranscriptionJob` — interface — `shared/types.ts:570-582`

| field | type | default | at |
|---|---|---|---|
| `jobId` | `string` | — | `shared/types.ts:571` |
| `videoPath` | `string` | — | `shared/types.ts:572` |
| `videoFilename` | `string` | — | `shared/types.ts:573` |
| `status` | `TranscriptionStatus → shared/types.TranscriptionStatus` | — | `shared/types.ts:574` |
| `duration` | `?: number` | — | `shared/types.ts:575` |
| `size` | `?: number` | — | `shared/types.ts:576` |
| `queuedAt` | `?: string` | — | `shared/types.ts:577` |
| `startedAt` | `?: string` | — | `shared/types.ts:578` |
| `completedAt` | `?: string` | — | `shared/types.ts:579` |
| `error` | `?: string` | — | `shared/types.ts:580` |
| `streamedText` | `?: string` | — | `shared/types.ts:581` |

### `shared/types.TranscriptionsResponse` — interface — `shared/types.ts:585-589`

| field | type | default | at |
|---|---|---|---|
| `active` | `TranscriptionJob \| null → shared/types.TranscriptionJob` | — | `shared/types.ts:586` |
| `queue` | `TranscriptionJob[] → shared/types.TranscriptionJob` | — | `shared/types.ts:587` |
| `recent` | `TranscriptionJob[] → shared/types.TranscriptionJob` | — | `shared/types.ts:588` |

### `shared/types.TranscriptionStatusResponse` — interface — `shared/types.ts:592-596`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:593` |
| `status` | `TranscriptionStatus → shared/types.TranscriptionStatus` | — | `shared/types.ts:594` |
| `transcriptPath` | `?: string` | — | `shared/types.ts:595` |

### `shared/types.TranscriptContentResponse` — interface — `shared/types.ts:599-602`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:600` |
| `content` | `string` | — | `shared/types.ts:601` |

### `shared/types.FileContentResponse` — interface — `shared/types.ts:605-611`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:606` |
| `filename` | `string` | — | `shared/types.ts:607` |
| `content` | `string` | — | `shared/types.ts:608` |
| `mimeType` | `string` | — | `shared/types.ts:609` |
| `error` | `?: string` | — | `shared/types.ts:610` |

### `shared/types.FinalVideoInfo` — interface — `shared/types.ts:616-622`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `shared/types.ts:617` |
| `filename` | `string` | — | `shared/types.ts:618` |
| `size` | `number` | — | `shared/types.ts:619` |
| `version` | `?: number` | — | `shared/types.ts:620` |
| `location` | `FinalMediaLocation → shared/types.FinalMediaLocation` | — | `shared/types.ts:621` |

### `shared/types.FinalSrtInfo` — interface — `shared/types.ts:624-629`

| field | type | default | at |
|---|---|---|---|
| `path` | `string` | — | `shared/types.ts:625` |
| `filename` | `string` | — | `shared/types.ts:626` |
| `size` | `number` | — | `shared/types.ts:627` |
| `location` | `FinalMediaLocation → shared/types.FinalMediaLocation` | — | `shared/types.ts:628` |

### `shared/types.AdditionalSegment` — interface — `shared/types.ts:631-635`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:632` |
| `size` | `number` | — | `shared/types.ts:633` |
| `hasSrt` | `boolean` | — | `shared/types.ts:634` |

### `shared/types.FinalMediaResponse` — interface — `shared/types.ts:637-642`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:638` |
| `video` | `?: FinalVideoInfo → shared/types.FinalVideoInfo` | — | `shared/types.ts:639` |
| `srt` | `?: FinalSrtInfo → shared/types.FinalSrtInfo` | — | `shared/types.ts:640` |
| `additionalSegments` | `?: AdditionalSegment[] → shared/types.AdditionalSegment` | — | `shared/types.ts:641` |

### `shared/types.ChapterMatchCandidate` — interface — `shared/types.ts:648-654`

| field | type | default | at |
|---|---|---|---|
| `timestamp` | `string` | — | `shared/types.ts:649` |
| `timestampSeconds` | `number` | — | `shared/types.ts:650` |
| `confidence` | `number` | — | `shared/types.ts:651` |
| `matchedText` | `string` | — | `shared/types.ts:652` |
| `matchMethod` | `'phrase' \| 'partial' \| 'keyword'` | — | `shared/types.ts:653` |

### `shared/types.ChapterMatch` — interface — `shared/types.ts:656-669`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `number` | — | `shared/types.ts:657` |
| `name` | `string` | — | `shared/types.ts:658` |
| `displayName` | `string` | — | `shared/types.ts:659` |
| `timestamp` | `?: string` | — | `shared/types.ts:660` |
| `timestampSeconds` | `?: number` | — | `shared/types.ts:661` |
| `confidence` | `number` | — | `shared/types.ts:662` |
| `status` | `ChapterMatchStatus → shared/types.ChapterMatchStatus` | — | `shared/types.ts:663` |
| `matchedText` | `?: string` | — | `shared/types.ts:665` |
| `transcriptSnippet` | `?: string` | — | `shared/types.ts:666` |
| `alternatives` | `?: ChapterMatchCandidate[] → shared/types.ChapterMatchCandidate` | — | `shared/types.ts:667` |
| `matchReason` | `?: string` | — | `shared/types.ts:668` |

### `shared/types.ChaptersResponse` — interface — `shared/types.ts:671-682`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:672` |
| `chapters` | `ChapterMatch[] → shared/types.ChapterMatch` | — | `shared/types.ts:673` |
| `formatted` | `string` | — | `shared/types.ts:674` |
| `error` | `?: string` | — | `shared/types.ts:675` |
| `stats` | `?: { elapsedMs: number; // Time taken in milliseconds srtSegments: number; // Number of SRT segments parsed chaptersFound: number; // Chapters…` | — | `shared/types.ts:676` |

### `shared/types.ChaptersResponse.stats` — type — `shared/types.ts:676-681`

| field | type | default | at |
|---|---|---|---|
| `elapsedMs` | `number` | — | `shared/types.ts:677` |
| `srtSegments` | `number` | — | `shared/types.ts:678` |
| `chaptersFound` | `number` | — | `shared/types.ts:679` |
| `chaptersTotal` | `number` | — | `shared/types.ts:680` |

### `shared/types.ChapterVerifyRequest` — interface — `shared/types.ts:687-699`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `number` | — | `shared/types.ts:688` |
| `name` | `string` | — | `shared/types.ts:689` |
| `transcriptSnippet` | `string` | — | `shared/types.ts:690` |
| `currentMatch` | `?: { // Current algorithmic match (if any) timestamp: string; confidence: number; matchedText: string; }` | — | `shared/types.ts:691` |
| `alternatives` | `?: ChapterMatchCandidate[] → shared/types.ChapterMatchCandidate` | — | `shared/types.ts:697` |
| `userHint` | `?: string` | — | `shared/types.ts:698` |

### `shared/types.ChapterVerifyRequest.currentMatch` — type — `shared/types.ts:691-696`

| field | type | default | at |
|---|---|---|---|
| `timestamp` | `string` | — | `shared/types.ts:693` |
| `confidence` | `number` | — | `shared/types.ts:694` |
| `matchedText` | `string` | — | `shared/types.ts:695` |

### `shared/types.ChapterVerifyResponse` — interface — `shared/types.ts:702-714`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:703` |
| `chapter` | `number` | — | `shared/types.ts:704` |
| `name` | `string` | — | `shared/types.ts:705` |
| `recommendation` | `{ action: 'use_current' \| 'use_alternative' \| 'manual_timestamp' \| 'skip'; timestamp?: string; // Recommended timestamp timestampSeconds?: …` | — | `shared/types.ts:706` |
| `error` | `?: string` | — | `shared/types.ts:713` |

### `shared/types.ChapterVerifyResponse.recommendation` — type — `shared/types.ts:706-712`

| field | type | default | at |
|---|---|---|---|
| `action` | `'use_current' \| 'use_alternative' \| 'manual_timestamp' \| 'skip'` | — | `shared/types.ts:707` |
| `timestamp` | `?: string` | — | `shared/types.ts:708` |
| `timestampSeconds` | `?: number` | — | `shared/types.ts:709` |
| `confidence` | `number` | — | `shared/types.ts:710` |
| `reasoning` | `string` | — | `shared/types.ts:711` |

### `shared/types.ChapterOverride` — interface — `shared/types.ts:717-725`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `number` | — | `shared/types.ts:718` |
| `name` | `string` | — | `shared/types.ts:719` |
| `action` | `'override' \| 'skip'` | — | `shared/types.ts:720` |
| `timestamp` | `?: string` | — | `shared/types.ts:721` |
| `timestampSeconds` | `?: number` | — | `shared/types.ts:722` |
| `reason` | `?: string` | — | `shared/types.ts:723` |
| `createdAt` | `string` | — | `shared/types.ts:724` |

### `shared/types.SetChapterOverrideRequest` — interface — `shared/types.ts:728-734`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `number` | — | `shared/types.ts:729` |
| `name` | `string` | — | `shared/types.ts:730` |
| `action` | `'override' \| 'skip'` | — | `shared/types.ts:731` |
| `timestamp` | `?: string` | — | `shared/types.ts:732` |
| `reason` | `?: string` | — | `shared/types.ts:733` |

### `shared/types.SetChapterOverrideResponse` — interface — `shared/types.ts:737-741`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:738` |
| `override` | `ChapterOverride → shared/types.ChapterOverride` | — | `shared/types.ts:739` |
| `error` | `?: string` | — | `shared/types.ts:740` |

### `shared/types.ChapterRecordingConfig` — interface — `shared/types.ts:744-749`

| field | type | default | at |
|---|---|---|---|
| `slideDuration` | `number` | — | `shared/types.ts:745` |
| `resolution` | `'720p' \| '1080p'` | — | `shared/types.ts:746` |
| `autoGenerate` | `boolean` | — | `shared/types.ts:747` |
| `includeTitleSlides` | `?: boolean` | — | `shared/types.ts:748` |

### `shared/types.ChapterRecordingRequest` — interface — `shared/types.ts:752-756`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `?: string` | — | `shared/types.ts:753` |
| `slideDuration` | `?: number` | — | `shared/types.ts:754` |
| `resolution` | `?: string` | — | `shared/types.ts:755` |

### `shared/types.ChapterRecordingResponse` — interface — `shared/types.ts:759-764`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:760` |
| `generated` | `string[]` | — | `shared/types.ts:761` |
| `errors` | `?: string[]` | — | `shared/types.ts:762` |
| `error` | `?: string` | — | `shared/types.ts:763` |

### `shared/types.ChapterGenerationProgress` — interface — `shared/types.ts:767-772`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `shared/types.ts:768` |
| `status` | `'pending' \| 'generating' \| 'complete' \| 'error'` | — | `shared/types.ts:769` |
| `outputFile` | `?: string` | — | `shared/types.ts:770` |
| `error` | `?: string` | — | `shared/types.ts:771` |

### `shared/types.QueryProjectSummary` — interface — `shared/types.ts:779-800`

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `shared/types.ts:780` |
| `brand` | `string` | — | `shared/types.ts:781` |
| `path` | `string` | — | `shared/types.ts:782` |
| `stage` | `ProjectStage → shared/types.ProjectStage` | — | `shared/types.ts:783` |
| `priority` | `ProjectPriority → shared/types.ProjectPriority` | — | `shared/types.ts:784` |
| `stats` | `{ recordings: number; chapters: number; transcriptPercent: number; images: number; thumbs: number; }` | — | `shared/types.ts:785` |
| `lastModified` | `string \| null` | — | `shared/types.ts:792` |
| `hasInbox` | `boolean` | — | `shared/types.ts:794` |
| `hasAssets` | `boolean` | — | `shared/types.ts:795` |
| `hasChapters` | `boolean` | — | `shared/types.ts:796` |
| `ships` | `ProjectShips → shared/types.ProjectShips` | — | `shared/types.ts:798` |
| `shipsDeclared` | `boolean` | — | `shared/types.ts:799` |

### `shared/types.QueryProjectSummary.stats` — type — `shared/types.ts:785-791`

| field | type | default | at |
|---|---|---|---|
| `recordings` | `number` | — | `shared/types.ts:786` |
| `chapters` | `number` | — | `shared/types.ts:787` |
| `transcriptPercent` | `number` | — | `shared/types.ts:788` |
| `images` | `number` | — | `shared/types.ts:789` |
| `thumbs` | `number` | — | `shared/types.ts:790` |

### `shared/types.QueryProjectDetail` — interface — `shared/types.ts:803-830`

| field | type | default | at |
|---|---|---|---|
| `code` | `string` | — | `shared/types.ts:804` |
| `path` | `string` | — | `shared/types.ts:805` |
| `title` | `?: string` | — | `shared/types.ts:806` |
| `ships` | `?: ProjectShips → shared/types.ProjectShips` | — | `shared/types.ts:807` |
| `shipsDeclared` | `?: boolean` | — | `shared/types.ts:808` |
| `stage` | `ProjectStage → shared/types.ProjectStage` | — | `shared/types.ts:809` |
| `priority` | `ProjectPriority → shared/types.ProjectPriority` | — | `shared/types.ts:810` |
| `stats` | `{ recordings: number; chapters: number; transcripts: { matched: number; missing: number; orphaned: number; }; images: number; thumbs: numbe…` | — | `shared/types.ts:812` |
| `finalMedia` | `{ video?: { filename: string; size: number }; srt?: { filename: string }; } \| null` | — | `shared/types.ts:824` |
| `createdAt` | `string \| null` | — | `shared/types.ts:828` |
| `lastModified` | `string \| null` | — | `shared/types.ts:829` |

### `shared/types.QueryProjectDetail.stats` — type — `shared/types.ts:812-823`

| field | type | default | at |
|---|---|---|---|
| `recordings` | `number` | — | `shared/types.ts:813` |
| `chapters` | `number` | — | `shared/types.ts:814` |
| `transcripts` | `{ matched: number; missing: number; orphaned: number; }` | — | `shared/types.ts:815` |
| `images` | `number` | — | `shared/types.ts:820` |
| `thumbs` | `number` | — | `shared/types.ts:821` |
| `totalDuration` | `number \| null` | — | `shared/types.ts:822` |

### `shared/types.QueryProjectDetail.stats.transcripts` — type — `shared/types.ts:815-819`

| field | type | default | at |
|---|---|---|---|
| `matched` | `number` | — | `shared/types.ts:816` |
| `missing` | `number` | — | `shared/types.ts:817` |
| `orphaned` | `number` | — | `shared/types.ts:818` |

### `shared/types.QueryRecording` — interface — `shared/types.ts:833-846`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:834` |
| `chapter` | `string` | — | `shared/types.ts:835` |
| `sequence` | `string` | — | `shared/types.ts:836` |
| `name` | `string` | — | `shared/types.ts:837` |
| `tags` | `string[]` | — | `shared/types.ts:838` |
| `folder` | `'recordings'` | — | `shared/types.ts:839` |
| `isSafe` | `boolean` | — | `shared/types.ts:840` |
| `isParked` | `boolean` | — | `shared/types.ts:841` |
| `annotation` | `?: string` | — | `shared/types.ts:842` |
| `size` | `number` | — | `shared/types.ts:843` |
| `duration` | `number \| null` | — | `shared/types.ts:844` |
| `hasTranscript` | `boolean` | — | `shared/types.ts:845` |

### `shared/types.QueryTranscript` — interface — `shared/types.ts:849-857`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:850` |
| `chapter` | `string` | — | `shared/types.ts:851` |
| `sequence` | `string` | — | `shared/types.ts:852` |
| `name` | `string` | — | `shared/types.ts:853` |
| `size` | `number` | — | `shared/types.ts:854` |
| `preview` | `?: string` | — | `shared/types.ts:855` |
| `content` | `?: string` | — | `shared/types.ts:856` |

### `shared/types.QueryChapter` — interface — `shared/types.ts:860-869`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `number` | — | `shared/types.ts:861` |
| `name` | `string` | — | `shared/types.ts:862` |
| `displayName` | `string` | — | `shared/types.ts:863` |
| `title` | `?: string` | — | `shared/types.ts:864` |
| `timestamp` | `string \| null` | — | `shared/types.ts:865` |
| `timestampSeconds` | `number \| null` | — | `shared/types.ts:866` |
| `recordingCount` | `number` | — | `shared/types.ts:867` |
| `hasTranscript` | `boolean` | — | `shared/types.ts:868` |

### `shared/types.QueryImage` — interface — `shared/types.ts:872-880`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:873` |
| `chapter` | `string` | — | `shared/types.ts:874` |
| `sequence` | `string` | — | `shared/types.ts:875` |
| `imageOrder` | `string` | — | `shared/types.ts:876` |
| `variant` | `string \| null` | — | `shared/types.ts:877` |
| `label` | `string` | — | `shared/types.ts:878` |
| `size` | `number` | — | `shared/types.ts:879` |

### `shared/types.SafeResponse` — interface — `shared/types.ts:887-893`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:888` |
| `moved` | `?: string[]` | — | `shared/types.ts:889` |
| `count` | `?: number` | — | `shared/types.ts:890` |
| `errors` | `?: string[]` | — | `shared/types.ts:891` |
| `error` | `?: string` | — | `shared/types.ts:892` |

### `shared/types.RestoreResponse` — interface — `shared/types.ts:896-902`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:897` |
| `restored` | `?: string[]` | — | `shared/types.ts:898` |
| `count` | `?: number` | — | `shared/types.ts:899` |
| `errors` | `?: string[]` | — | `shared/types.ts:900` |
| `error` | `?: string` | — | `shared/types.ts:901` |

### `shared/types.ParkResponse` — interface — `shared/types.ts:905-911`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:906` |
| `parked` | `?: string[]` | — | `shared/types.ts:907` |
| `count` | `?: number` | — | `shared/types.ts:908` |
| `errors` | `?: string[]` | — | `shared/types.ts:909` |
| `error` | `?: string` | — | `shared/types.ts:910` |

### `shared/types.UnparkResponse` — interface — `shared/types.ts:914-920`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:915` |
| `unparked` | `?: string[]` | — | `shared/types.ts:916` |
| `count` | `?: number` | — | `shared/types.ts:917` |
| `errors` | `?: string[]` | — | `shared/types.ts:918` |
| `error` | `?: string` | — | `shared/types.ts:919` |

### `shared/types.RenameChapterResponse` — interface — `shared/types.ts:923-927`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:924` |
| `renamedFiles` | `string[]` | — | `shared/types.ts:925` |
| `error` | `?: string` | — | `shared/types.ts:926` |

### `shared/types.QueueAllResponse` — interface — `shared/types.ts:930-939`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:931` |
| `scope` | `'project' \| 'chapter'` | — | `shared/types.ts:932` |
| `chapter` | `string \| null` | — | `shared/types.ts:933` |
| `queued` | `string[]` | — | `shared/types.ts:934` |
| `skipped` | `string[]` | — | `shared/types.ts:935` |
| `queuedCount` | `number` | — | `shared/types.ts:936` |
| `skippedCount` | `number` | — | `shared/types.ts:937` |
| `error` | `?: string` | — | `shared/types.ts:938` |

### `shared/types.RecentRename` — interface — `shared/types.ts:942-948`

| field | type | default | at |
|---|---|---|---|
| `id` | `string` | — | `shared/types.ts:943` |
| `originalName` | `string` | — | `shared/types.ts:944` |
| `newName` | `string` | — | `shared/types.ts:945` |
| `timestamp` | `number` | — | `shared/types.ts:946` |
| `age` | `number` | — | `shared/types.ts:947` |

### `shared/types.InboxFile` — interface — `shared/types.ts:951-955`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:952` |
| `size` | `number` | — | `shared/types.ts:953` |
| `modifiedAt` | `string` | — | `shared/types.ts:954` |

### `shared/types.InboxSubfolder` — interface — `shared/types.ts:958-963`

| field | type | default | at |
|---|---|---|---|
| `name` | `string` | — | `shared/types.ts:959` |
| `path` | `string` | — | `shared/types.ts:960` |
| `fileCount` | `number` | — | `shared/types.ts:961` |
| `files` | `InboxFile[] → shared/types.InboxFile` | — | `shared/types.ts:962` |

### `shared/types.InboxResponse` — interface — `shared/types.ts:966-972`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:967` |
| `inbox` | `{ totalFiles: number; subfolders: InboxSubfolder[]; } → shared/types.InboxSubfolder` | — | `shared/types.ts:968` |

### `shared/types.InboxResponse.inbox` — type — `shared/types.ts:968-971`

| field | type | default | at |
|---|---|---|---|
| `totalFiles` | `number` | — | `shared/types.ts:969` |
| `subfolders` | `InboxSubfolder[] → shared/types.InboxSubfolder` | — | `shared/types.ts:970` |

### `shared/types.ChapterRecordingStatusResponse` — interface — `shared/types.ts:975-984`

| field | type | default | at |
|---|---|---|---|
| `isGenerating` | `boolean` | — | `shared/types.ts:976` |
| `chapters` | `Array<{ chapter: string; label: string; segmentCount: number; totalDuration: number; }>` | — | `shared/types.ts:977` |
| `existing` | `string[]` | — | `shared/types.ts:983` |

### `shared/types.EnvironmentResponse` — interface — `shared/types.ts:987-997`

| field | type | default | at |
|---|---|---|---|
| `platform` | `'win32' \| 'linux' \| 'darwin'` | — | `shared/types.ts:988` |
| `isWSL` | `boolean` | — | `shared/types.ts:989` |
| `pathFormat` | `'windows' \| 'linux'` | — | `shared/types.ts:990` |
| `guidance` | `{ nativeFiles: string; // e.g., '/home/jan/...' or 'C:\\...' windowsFiles: string; // e.g., '/mnt/c/...' or 'C:\\...' wslFiles: string; // …` | — | `shared/types.ts:991` |
| `machineRole` | `MachineRole → shared/types.MachineRole` | — | `shared/types.ts:996` |

### `shared/types.EnvironmentResponse.guidance` — type — `shared/types.ts:991-995`

| field | type | default | at |
|---|---|---|---|
| `nativeFiles` | `string` | — | `shared/types.ts:992` |
| `windowsFiles` | `string` | — | `shared/types.ts:993` |
| `wslFiles` | `string` | — | `shared/types.ts:994` |

### `shared/types.RecordingState` — interface — `shared/types.ts:1004-1010`

| field | type | default | at |
|---|---|---|---|
| `safe` | `?: boolean` | — | `shared/types.ts:1005` |
| `parked` | `?: boolean` | — | `shared/types.ts:1006` |
| `annotation` | `?: string` | — | `shared/types.ts:1007` |
| `stage` | `?: string` | — | `shared/types.ts:1008` |
| `aspectWarning` | `?: AspectCheck & { dismissedAt?: string } → shared/types.AspectCheck` | — | `shared/types.ts:1009` |

### `shared/types.ChapterState` — interface — `shared/types.ts:1013-1015`

| field | type | default | at |
|---|---|---|---|
| `title` | `?: string` | — | `shared/types.ts:1014` |

### `shared/types.ProjectState` — interface — `shared/types.ts:1039-1047`

| field | type | default | at |
|---|---|---|---|
| `version` | `1` | — | `shared/types.ts:1040` |
| `recordings` | `Record<string, RecordingState> → shared/types.RecordingState` | — | `shared/types.ts:1041` |
| `title` | `?: string` | — | `shared/types.ts:1042` |
| `chapters` | `?: Record<string, ChapterState> → shared/types.ChapterState` | — | `shared/types.ts:1043` |
| `ships` | `?: ProjectShips → shared/types.ProjectShips` | — | `shared/types.ts:1044` |
| `glingDictionary` | `?: string[]` | — | `shared/types.ts:1045` |
| `editManifest` | `?: EditManifest → shared/types.EditManifest` | — | `shared/types.ts:1046` |

### `shared/types.ProjectStateResponse` — interface — `shared/types.ts:1050-1054`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:1051` |
| `state` | `ProjectState → shared/types.ProjectState` | — | `shared/types.ts:1052` |
| `error` | `?: string` | — | `shared/types.ts:1053` |

### `shared/types.UpdateProjectStateRequest` — interface — `shared/types.ts:1057-1059`

| field | type | default | at |
|---|---|---|---|
| `recordings` | `Record<string, RecordingState> → shared/types.RecordingState` | — | `shared/types.ts:1058` |

### `shared/types.EditManifestFile` — interface — `shared/types.ts:1066-1071`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:1067` |
| `sourceHash` | `string` | — | `shared/types.ts:1068` |
| `copiedAt` | `string` | — | `shared/types.ts:1069` |
| `sourceSize` | `number` | — | `shared/types.ts:1070` |

### `shared/types.EditFolderManifest` — interface — `shared/types.ts:1074-1077`

| field | type | default | at |
|---|---|---|---|
| `lastCopied` | `string \| null` | — | `shared/types.ts:1075` |
| `files` | `EditManifestFile[] → shared/types.EditManifestFile` | — | `shared/types.ts:1076` |

### `shared/types.EditManifest` — interface — `shared/types.ts:1080-1084`

| field | type | default | at |
|---|---|---|---|
| `edit-1st` | `EditFolderManifest → shared/types.EditFolderManifest` | — | `shared/types.ts:1081` |
| `edit-2nd` | `EditFolderManifest → shared/types.EditFolderManifest` | — | `shared/types.ts:1082` |
| `edit-final` | `EditFolderManifest → shared/types.EditFolderManifest` | — | `shared/types.ts:1083` |

### `shared/types.ManifestFileStatus` — interface — `shared/types.ts:1111-1116`

| field | type | default | at |
|---|---|---|---|
| `filename` | `string` | — | `shared/types.ts:1112` |
| `status` | `'present' \| 'missing' \| 'changed'` | — | `shared/types.ts:1113` |
| `sourceSize` | `?: number` | — | `shared/types.ts:1114` |
| `currentHash` | `?: string` | — | `shared/types.ts:1115` |

### `shared/types.ManifestStatusDetail` — interface — `shared/types.ts:1121-1129`

| field | type | default | at |
|---|---|---|---|
| `status` | `ManifestStatus → shared/types.ManifestStatus` | — | `shared/types.ts:1122` |
| `manifestedFiles` | `number` | — | `shared/types.ts:1123` |
| `presentFiles` | `number` | — | `shared/types.ts:1124` |
| `missingFiles` | `number` | — | `shared/types.ts:1125` |
| `changedFiles` | `number` | — | `shared/types.ts:1126` |
| `totalSize` | `number` | — | `shared/types.ts:1127` |
| `fileDetails` | `?: ManifestFileStatus[] → shared/types.ManifestFileStatus` | — | `shared/types.ts:1128` |

### `shared/types.ManifestStatusResponse` — interface — `shared/types.ts:1132-1137`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:1133` |
| `folder` | `EditFolderKey → shared/types.EditFolderKey` | — | `shared/types.ts:1134` |
| `detail` | `ManifestStatusDetail → shared/types.ManifestStatusDetail` | — | `shared/types.ts:1135` |
| `error` | `?: string` | — | `shared/types.ts:1136` |

### `shared/types.CleanEditFolderResponse` — interface — `shared/types.ts:1140-1148`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:1141` |
| `folder` | `EditFolderKey → shared/types.EditFolderKey` | — | `shared/types.ts:1142` |
| `deleted` | `string[]` | — | `shared/types.ts:1143` |
| `deletedCount` | `number` | — | `shared/types.ts:1144` |
| `spaceSaved` | `number` | — | `shared/types.ts:1145` |
| `preserved` | `string[]` | — | `shared/types.ts:1146` |
| `error` | `?: string` | — | `shared/types.ts:1147` |

### `shared/types.RestoreEditFolderResponse` — interface — `shared/types.ts:1151-1158`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:1152` |
| `folder` | `EditFolderKey → shared/types.EditFolderKey` | — | `shared/types.ts:1153` |
| `restored` | `string[]` | — | `shared/types.ts:1154` |
| `restoredCount` | `number` | — | `shared/types.ts:1155` |
| `warnings` | `?: string[]` | — | `shared/types.ts:1156` |
| `error` | `?: string` | — | `shared/types.ts:1157` |

### `shared/types.SplitChapterRequest` — interface — `shared/types.ts:1161-1164`

| field | type | default | at |
|---|---|---|---|
| `chapter` | `string` | — | `shared/types.ts:1162` |
| `splitAtSequence` | `number` | — | `shared/types.ts:1163` |

### `shared/types.SplitChapterResponse` — interface — `shared/types.ts:1166-1174`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:1167` |
| `sourceChapter` | `string` | — | `shared/types.ts:1168` |
| `newChapter` | `string` | — | `shared/types.ts:1169` |
| `filesMoved` | `number` | — | `shared/types.ts:1170` |
| `cascadedChapters` | `number` | — | `shared/types.ts:1171` |
| `undoMapping` | `Array<{ oldFilename: string; newFilename: string }>` | — | `shared/types.ts:1172` |
| `error` | `?: string` | — | `shared/types.ts:1173` |

### `shared/types.UndoRenameResponse` — interface — `shared/types.ts:1177-1181`

| field | type | default | at |
|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:1178` |
| `filesReverted` | `number` | — | `shared/types.ts:1179` |
| `error` | `?: string` | — | `shared/types.ts:1180` |

### `shared/types.MicCheckTick` — interface — `shared/types.ts:1197-1223`

| field | type | default | at | note |
|---|---|---|---|---|
| `t` | `number` | — | `shared/types.ts:1199` | Milliseconds since session start. |
| `mode` | `MicCheckMode → shared/types.MicCheckMode` | — | `shared/types.ts:1204` | DECLARED — which screen the operator pressed. Authoritative, never inferred. |
| `shortTermLufs` | `number \| null` | — | `shared/types.ts:1205` |  |
| `samplePeakDbfs` | `number \| null` | — | `shared/types.ts:1206` |  |
| `clipCount` | `number` | — | `shared/types.ts:1207` |  |
| `nearClipCount` | `number` | — | `shared/types.ts:1208` |  |
| `windowFull` | `boolean` | — | `shared/types.ts:1210` | False until a full 3 s short-term window has been observed. |
| `speechDetected` | `boolean` | — | `shared/types.ts:1222` | MEASURED — does THIS tick contain speech (level vs the floor)? |

### `shared/types.MicCheckEvent` — interface — `shared/types.ts:1240-1246`

A timestamped observation. Persisted because it CANNOT be re-derived later: a level

| field | type | default | at | note |
|---|---|---|---|---|
| `t` | `number` | — | `shared/types.ts:1241` |  |
| `kind` | `MicCheckEventKind → shared/types.MicCheckEventKind` | — | `shared/types.ts:1242` |  |
| `label` | `string` | — | `shared/types.ts:1244` | Phrased as an observation, never an attributed cause. |
| `deltaDb` | `?: number` | — | `shared/types.ts:1245` |  |

### `shared/types.MicCheckConstraints` — interface — `shared/types.ts:1249-1254`

The four-way constraint report: what we asked for vs what we actually got.

| field | type | default | at |
|---|---|---|---|
| `asked` | `Record<string, unknown>` | — | `shared/types.ts:1250` |
| `got` | `Record<string, unknown>` | — | `shared/types.ts:1251` |
| `capable` | `Record<string, unknown> \| null` | — | `shared/types.ts:1252` |
| `supported` | `Record<string, unknown>` | — | `shared/types.ts:1253` |

### `shared/types.MicCheckProbe` — interface — `shared/types.ts:1258-1264`

| field | type | default | at |
|---|---|---|---|
| `verdict` | `MicCheckProbeVerdict → shared/types.MicCheckProbeVerdict` | — | `shared/types.ts:1259` |
| `findings` | `string[]` | — | `shared/types.ts:1260` |
| `capturedLevelDbfs` | `number` | — | `shared/types.ts:1261` |
| `levelDriftDb` | `number` | — | `shared/types.ts:1262` |
| `deepestNotchDb` | `number` | — | `shared/types.ts:1263` |

### `shared/types.MicCheckNotMeasured` — interface — `shared/types.ts:1271-1274`

Every metric NOT measured, and why. This is the grey-never-becomes-green rule

| field | type | default | at |
|---|---|---|---|
| `metric` | `string` | — | `shared/types.ts:1272` |
| `reason` | `string` | — | `shared/types.ts:1273` |

### `shared/types.MicCheckDevice` — interface — `shared/types.ts:1276-1281`

| field | type | default | at |
|---|---|---|---|
| `label` | `string` | — | `shared/types.ts:1277` |
| `sampleRate` | `number \| null` | — | `shared/types.ts:1278` |
| `channelCount` | `number \| null` | — | `shared/types.ts:1279` |
| `sampleSize` | `number \| null` | — | `shared/types.ts:1280` |

### `shared/types.MicCheckSummary` — interface — `shared/types.ts:1283-1295`

| field | type | default | at | note |
|---|---|---|---|---|
| `durationMs` | `number` | — | `shared/types.ts:1284` |  |
| `tickCount` | `number` | — | `shared/types.ts:1285` |  |
| `measurableTickCount` | `number` | — | `shared/types.ts:1287` | Ticks where the window was full AND speech was present — the only gradeable ones. |
| `shortTermLufs` | `{ min: number; max: number; mean: number } \| null` | — | `shared/types.ts:1289` | Null when no tick was ever measurable. Never silently 0. |
| `driftLu` | `number \| null` | — | `shared/types.ts:1291` | Widest observed spread in LUFS. Large => the level drifted rather than held. |
| `sessionPeakDbfs` | `number \| null` | — | `shared/types.ts:1292` |  |
| `clipCount` | `number` | — | `shared/types.ts:1293` |  |
| `nearClipCount` | `number` | — | `shared/types.ts:1294` |  |

### `shared/types.MicCheckSession` — interface — `shared/types.ts:1297-1313`

| field | type | default | at | note |
|---|---|---|---|---|
| `sessionId` | `string` | — | `shared/types.ts:1298` |  |
| `startedAt` | `string` | — | `shared/types.ts:1299` |  |
| `finishedAt` | `string \| null` | — | `shared/types.ts:1300` |  |
| `projectCode` | `string \| null` | — | `shared/types.ts:1302` | Active project at session start, if any. Lets a report attach to a take later. |
| `workletVersion` | `string \| null` | — | `shared/types.ts:1303` |  |
| `device` | `MicCheckDevice → shared/types.MicCheckDevice` | — | `shared/types.ts:1304` |  |
| `constraints` | `MicCheckConstraints \| null → shared/types.MicCheckConstraints` | — | `shared/types.ts:1305` |  |
| `probe` | `MicCheckProbe \| null → shared/types.MicCheckProbe` | — | `shared/types.ts:1306` |  |
| `summary` | `MicCheckSummary \| null → shared/types.MicCheckSummary` | — | `shared/types.ts:1307` |  |
| `series` | `MicCheckTick[] → shared/types.MicCheckTick` | — | `shared/types.ts:1308` |  |
| `events` | `MicCheckEvent[] → shared/types.MicCheckEvent` | — | `shared/types.ts:1309` |  |
| `roomReferenceLufs` | `number \| null` | — | `shared/types.ts:1311` | Noise floor captured during ROOM mode, in LUFS. Null when never captured. |
| `not_measured` | `MicCheckNotMeasured[] → shared/types.MicCheckNotMeasured` | — | `shared/types.ts:1312` |  |

### `shared/types.MicCheckSessionListEntry` — interface — `shared/types.ts:1316-1324`

Listing entry — the summary fields, without the series.

| field | type | default | at |
|---|---|---|---|
| `sessionId` | `string` | — | `shared/types.ts:1317` |
| `startedAt` | `string` | — | `shared/types.ts:1318` |
| `finishedAt` | `string \| null` | — | `shared/types.ts:1319` |
| `projectCode` | `string \| null` | — | `shared/types.ts:1320` |
| `deviceLabel` | `string` | — | `shared/types.ts:1321` |
| `summary` | `MicCheckSummary \| null → shared/types.MicCheckSummary` | — | `shared/types.ts:1322` |
| `probeVerdict` | `MicCheckProbeVerdict \| null → shared/types.MicCheckProbeVerdict` | — | `shared/types.ts:1323` |

### `shared/types.MicCheckLiveResponse` — interface — `shared/types.ts:1337-1345`

GET /api/query/miccheck/live

| field | type | default | at | note |
|---|---|---|---|---|
| `success` | `boolean` | — | `shared/types.ts:1338` |  |
| `active` | `boolean` | — | `shared/types.ts:1339` |  |
| `measurable` | `boolean` | — | `shared/types.ts:1340` |  |
| `reason` | `string \| null` | — | `shared/types.ts:1342` | Always populated when active=false or measurable=false. |
| `session` | `MicCheckSession \| null → shared/types.MicCheckSession` | — | `shared/types.ts:1343` |  |
| `latest` | `MicCheckTick \| null → shared/types.MicCheckTick` | — | `shared/types.ts:1344` |  |

## Cannot be mirrored

These were looked at and could not be resolved to an authority. **Nothing is guessed for them.** Each is a real gap in this page.

| subject | why | looked at |
|---|---|---|
| 2 hand-written declaration file(s) excluded by default | `*.d.ts` is excluded so build output cannot shadow its source; these have no sibling source, so their declarations are NOT on this page. Re-run with --no-default-excludes (and your own --exclude list) to include them. | `client/src/vite-env.d.ts`<br>`server/src/types/string-comparisons.d.ts` |
| shared/contextSchemas.ContextBodySchema | shape computed by `.partial(...)` - a transform of another schema, not expanded | `z.object({ brand: NonEmpty, project: NonEmpty, video: VideoFolderName }).partial() (shared/contextSchemas.ts:15)` |

### Declared but not read

The census found these top-level declarations and the extractor did not mirror them. Nothing else about them is on this page.

| family | count | declarations |
|---|---|---|
| object constant | 12 | `client/src/components/shared/ShipsSelector.SHIPS_LABEL` `client/src/components/shared/ShipsSelector.tsx:17`<br>`client/src/constants/queryKeys.QUERY_KEYS` `client/src/constants/queryKeys.ts:5`<br>`client/src/constants/stages.STAGE_DISPLAY` `client/src/constants/stages.ts:4`<br>`server/src/config/configManager.DEFAULT_DISK_THRESHOLDS` `server/src/config/configManager.ts:7`<br>`server/src/config/env.env` `server/src/config/env.ts:25`<br>`server/src/config/logger.log` `server/src/config/logger.ts:20`<br>`server/src/utils/formatters.STATUS` `server/src/utils/formatters.ts:151`<br>`shared/constants.FILE_SIZE` `shared/constants.ts:6`<br>`shared/constants.WATCHER` `shared/constants.ts:14`<br>`shared/naming.NAMING_RULES` `shared/naming.ts:16`<br>`shared/naming.PATTERNS` `shared/naming.ts:55`<br>`shared/types.STAGE_LABELS` `shared/types.ts:324` |
| array constant | 10 | `client/src/constants/stages.STAGE_ORDER` `client/src/constants/stages.ts:73`<br>`client/src/hooks/useBrollApi.BROLL_QUERY_KEY` `client/src/hooks/useBrollApi.ts:12`<br>`client/src/hooks/useOpenContextApi.OPEN_CONTEXT_KEY` `client/src/hooks/useOpenContextApi.ts:8`<br>`client/src/hooks/useVideoPlayback.SPEED_PRESETS` `client/src/hooks/useVideoPlayback.ts:10`<br>`client/src/utils/micGrading.SHORT_TERM_GREEN` `client/src/utils/micGrading.ts:38`<br>`server/src/utils/holdUtils.HOLD_EXCLUDES` `server/src/utils/holdUtils.ts:10`<br>`shared/apiRegistry.API_ENDPOINTS` `shared/apiRegistry.ts:38`<br>`shared/contextSchemas.REFUSAL_CODES` `shared/contextSchemas.ts:36`<br>`shared/types.DEFAULT_PROJECT_STAGES` `shared/types.ts:311`<br>`shared/types.DEFAULT_TAGS` `shared/types.ts:272` |
| const built by a call (helper or non-zod call) | 8 | `client/src/config.API_URL` `client/src/config.ts:14`<br>`client/src/hooks/useStorageApi.useArchiveProject` `client/src/hooks/useStorageApi.ts:79`<br>`client/src/hooks/useStorageApi.useHeldArchiveProject` `client/src/hooks/useStorageApi.ts:83`<br>`client/src/hooks/useStorageApi.useHoldProject` `client/src/hooks/useStorageApi.ts:77`<br>`client/src/hooks/useStorageApi.useRestoreHeld` `client/src/hooks/useStorageApi.ts:78`<br>`client/src/hooks/useStorageApi.useUnarchiveProject` `client/src/hooks/useStorageApi.ts:80`<br>`server/src/config/logger.logger` `server/src/config/logger.ts:5`<br>`server/src/utils/poemWuiUtils.BUNDLED_BRAND_CONFIG` `server/src/utils/poemWuiUtils.ts:10` |
| union of named or mixed types | 4 | `client/src/App.ConfigFocusSection` `client/src/App.tsx:86`<br>`client/src/hooks/useShiftHover.LegacyImageData` `client/src/hooks/useShiftHover.ts:25`<br>`server/src/utils/openContext.LaunchResult` `server/src/utils/openContext.ts:62`<br>`shared/types.ProjectStageOverride` `shared/types.ts:307` |
| class | 3 | `client/src/utils/micTrajectory.TrajectoryTracker` `client/src/utils/micTrajectory.ts:69`<br>`server/src/WatcherManager.WatcherManager` `server/src/WatcherManager.ts:29`<br>`server/src/middleware/errorHandler.AppError` `server/src/middleware/errorHandler.ts:15` |
| utility-type alias (`Pick` / `Omit` / `Record` / generic instance) | 3 | `client/src/components/MicCheckSnapshot.Analyser` `client/src/components/MicCheckSnapshot.tsx:34`<br>`server/src/routes/miccheck.IO` `server/src/routes/miccheck.ts:32`<br>`server/src/utils/openContext.ContextController` `server/src/utils/openContext.ts:281` |
| constant (other form) | 1 | `client/src/hooks/useVideoAspect.DEFAULT_ASPECT` `client/src/hooks/useVideoAspect.ts:12` |
| derived type (`keyof typeof`, indexed access, `typeof`) | 1 | `server/src/config/env.Env` `server/src/config/env.ts:33` |
| generic type alias | 1 | `server/src/utils/aspectCheck.Same` `server/src/utils/aspectCheck.ts:14` |

## Findings — changes needed in the target application

These are refactors of the **application**, not of this mirror. Each one converts a derived section into a declared one.

1. `client/src/components/ApiExplorer.tsx:156` — REFACTOR: the set for `selectedEndpoint.method` is inlined at client/src/components/ApiExplorer.tsx:156. Name it once (z.enum / literal union) so it has one authority.
2. `client/src/components/AssetsPage.tsx:206` — REFACTOR: the set for `stored` is inlined at client/src/components/AssetsPage.tsx:206. Name it once (z.enum / literal union) so it has one authority.
3. `client/src/components/AssetsPage.tsx:214` — REFACTOR: the set for `stored` is inlined at client/src/components/AssetsPage.tsx:214. Name it once (z.enum / literal union) so it has one authority.
4. `client/src/components/ConfigPanel.tsx:842` — REFACTOR: `preset` is a closed set enforced only by control flow at client/src/components/ConfigPanel.tsx:842. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.
5. `client/src/components/InboxPage.tsx:19-30` — REFACTOR (minor): `VIEWABLE_EXTENSIONS` at client/src/components/InboxPage.tsx:19 names the set but does not type it. A z.enum or `as const` + `typeof VIEWABLE_EXTENSIONS[number]` would make a wrong value a static error rather than a runtime miss.
6. `client/src/components/TranscriptionsPage.tsx:254` — REFACTOR: `status` is a closed set enforced only by control flow at client/src/components/TranscriptionsPage.tsx:254. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.
7. `client/src/utils/projectFilters.ts:39` — REFACTOR: `activePreset` is a closed set enforced only by control flow at client/src/utils/projectFilters.ts:39. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.
8. `server/src/routes/assets.ts:30` — REFACTOR (minor): `IMAGE_EXTENSIONS` at server/src/routes/assets.ts:30 names the set but does not type it. A z.enum or `as const` + `typeof IMAGE_EXTENSIONS[number]` would make a wrong value a static error rather than a runtime miss.
9. `server/src/routes/projects.ts:148` — REFACTOR: the set for `priority` is inlined at server/src/routes/projects.ts:148. Name it once (z.enum / literal union) so it has one authority.
10. `server/src/routes/thumbs.ts:11` — REFACTOR (minor): `IMAGE_EXTENSIONS` at server/src/routes/thumbs.ts:11 names the set but does not type it. A z.enum or `as const` + `typeof IMAGE_EXTENSIONS[number]` would make a wrong value a static error rather than a runtime miss.
11. `server/src/routes/transcriptions.ts:637` — REFACTOR: the set for `scope` is inlined at server/src/routes/transcriptions.ts:637. Name it once (z.enum / literal union) so it has one authority.
12. `server/src/routes/video.ts:81` — REFACTOR: `folder` is a closed set enforced only by control flow at server/src/routes/video.ts:81. Declare it once (a z.enum or a literal union type) and type the subject with it; until then this section is DERIVED and will drift silently.
13. `server/src/routes/video.ts:161` — REFACTOR: the set for `ext` is inlined at server/src/routes/video.ts:161. Name it once (z.enum / literal union) so it has one authority.
14. `server/src/routes/video.ts:242` — REFACTOR: the set for `ext` is inlined at server/src/routes/video.ts:242. Name it once (z.enum / literal union) so it has one authority.
15. `server/src/utils/chapterExtraction.ts:208` — REFACTOR: the set for `word.toLowerCase()` is inlined at server/src/utils/chapterExtraction.ts:208. Name it once (z.enum / literal union) so it has one authority.
16. `server/src/utils/loopback.ts:13` — REFACTOR (minor): `LOOPBACK_HOSTS` at server/src/utils/loopback.ts:13 names the set but does not type it. A z.enum or `as const` + `typeof LOOPBACK_HOSTS[number]` would make a wrong value a static error rather than a runtime miss.

---

Regenerate: `schema-mirror` skill → `extract_typescript.py` + `render_mirror.py`. Check for drift: `verify_mirror.py`.
