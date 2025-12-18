Bugs
----

1. As the content creator, if I manually remove the Ecamm Live video from the hard drive, it should automatically get removed From the incoming file list, so that I know what files are really available for me to rename.
2. As a content creator, if I see an incoming file from Ecamm Live in the web interface and I hit discard, it should remove it from the web interface and move it into the `-trash` directory (sibling to recordings), so that if I do need it back, I haven't lost it. (Note: Use `-trash` not `.trash` so it's visible in Finder)

Functional Requirementents
--------------------------

1. As a Content Creator, when I start a new video project The chapter, segment and label should default to 01, 1 and intro so that I don't have to remember how to name the first video.
2. As a content creator, when I finish recording a video and it comes into the incoming files list, it should automatically increment the segment number by one, So that I don't have to remember to change it and I don't accidentally overwrite an existing video.
3. As a content creator, I should have a button that says new chapter which will automatically increment the chapter and reset the segment to one and clear out the label so that it's easy for me to change Chapters with consistent naming.
4. As a content creator, I should be able to open the application pointed at a folder and when the folder changes, it recalculates what the next chapter ID, segment ID and name should be.
5. As a content creator, when a video appears in the incoming files list, I should see its file size and duration so that I can quickly identify which recordings are real takes versus quick discards. The likely "good take" (largest/longest recent file) should be visually highlighted so I can focus on the right file when multiple recordings are pending.
6. As a content creator, I want the application to run on port 5100 by default (instead of Vite's default 5173), so I have a consistent, predictable URL to access the Recording Namer.
7. As a content creator, when multiple recordings are in the incoming files list, I want the "likely good take" highlighting to consider both file size AND recency with appropriate weighting (40% size, 60% recency), so that later recordings (which are often refined, faster deliveries) are prioritized. Best take shows green, second best shows yellow.
8. As a content creator, I want to see a panel listing all available AppyDave video projects (from ~/dev/video-projects/v-appydave/), so I can understand what projects exist. The list shows project code, file count, and last modified date.
9. As a content creator, I want to switch projects by clicking on a project code in the project list, so I can quickly change target folders without manual path entry. Clicking updates the target directory to {project-path}/recordings/.
10. As a content creator, I want to create a new video project from the Recording Namer by entering a project code (kebab-case like b73-my-project), so I can start a new project without leaving the application. The app creates the project folder and recordings subdirectory, then auto-switches to it.
