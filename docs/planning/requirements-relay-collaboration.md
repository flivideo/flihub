0:00 The following is a transcript for the AI to read and also for Jan to understand what we're going to do.
0:10 He can run it on his own system, but firstly, uhm, on David's system is where the development will happen. So when we look at FlyHub at the moment, it's a list of projects.
0:22 One of the things we're not sure of is the project.json document, which probably sits in the repository, is, ah, global to the repository, or is there an individual.json document for each video in the repository?
0:41 If there is a global projects.json document, then there's a problem if we want to use it to save images. Because David will save data, Jan will save data, and the file will get merge conflicts.
0:56 It won't know how to resolve the changes between David and Jan's systems, when we do git pulls and git syncs, if the project folder is at the parent level.
1:10 If, on the other hand, each individual video is own individual file, then it's much less likely that David's saving something would override Jan, if he knows that Jan's going to work on that, he won't touch it until he gets the information back.
1:28 So that's one problem we have to look at. When we go and look at the studio signal application, there's a cool feature here.
1:36 built into the studio signal application called, Git, well, I don't know what it's called, but what it is, is it's a Git synchronization system.
1:48 It can do two things. It can, well, one thing it does is it pushes and it pulls data. So any data that changes can be synchronized, not by going into the terminal and typing Git push, Git commit, any of that sort of rubbish.
2:04 It's just a little button on the application. And that button is really cool because it pulls every now and then.
2:10 So if the other person changes data, I will see that my Git is out of date and I just press on the button and it downloads the data.
2:19 This would be really good so that if I added a new video into the system and was running FlyHub, he would just see it get added, he wouldn't see it get added to the project straight away, but he would see that his Git is out of sync and he could press a button and it would be in sync and suddenly he 
2:37 sees the video. That would be really cool. Now, another capability that we added this week, and we tested it out over on the Digital Summit 2026 Folder, is this thing called SyncThing.
2:53 And SyncThing is an application we've installed that will automatically sync between two folders. And what Jan and I have done is set up a folder off our home directory called Relay, and in it we've got a folder called Jan, David-Jan.
3:13 And we used it as a test, ah, sort of system. Now, whenever Jan is in these folders, one of the things that he should have is his view changed to columns.
3:25 It's the third icon along. So, if he's not doing that, tell him. Uhm, now, what, what we need is probably another folder which is not DaveJan because that's, that's for something we did.
3:41 We need one particularly for FlyHub. So, I would, I would actually call it, because the folder we want to synchronize is very much going to be related to the v-appydave, I think we should have a FlyHub-appydave.
4:01 folder under Relay. And what that should be is the sort of files that we used to synchronize on the S3 bucket will now do with the Relay.
4:14 So, rather than sending a video that's completed to an S3 bucket, we'll just put it into this directory. And so long as it maps.
4:25 To the, uhm, so long as it maps to the FlyHub conventions, the video should flow through. But, we need to alter the FlyHub application too, so at any time, I can take any of the raw videos that I record and make them available to Jam.
4:44 And that's going to be a similar thing. And we should be able to undo it as well. So, let me talk through the workflow.
4:52 David goes into FlyHub, and what he does is he starts recording a video. He gets Chapter 1, Segment 1, Chapter 1, Segment 2.
5:01 Then he goes New Chapter. He gets Chapter 2, Segment 1, Chapter 2, Segment 2, Chapter 2, Segment 3. Then he does a New Chapter.
5:09 Chapter 3, Segment 1. And they're also labelled. Then what happens, this is the normal flow for David, is he pulls them all into Gling.
5:19 He edits them, he exports it from Gling, and it goes into some folder called Post, Post 1. It's one of the S3 buckets.
5:29 So, the final, ah, first edited part of the video goes into that S3 bucket. It goes to Jam. I'm using the, ah, Digital Asset Management command line tool that we've got.
5:42 Jam would then download it. He would do a synchronization. He would then go and edit it in Camtasia, or he might do it in DaVinci Resolve.
5:54 He'll make it better. He puts it into the second edit. Ah, he pushes it to S3. I then pull it.
6:01 I then publish it. It's really painful. And what Jam can't do right now, which is the next thing I need him to be able to do, is he cannot do the Gling edits for me because he never receives the individual recordings.
6:20 So, what would be lovely is this idea that when I finish my recordings, he'll I can press a button and they are all copied over into this relay area under the same project location and he, he gets, he gets a notification in his version of FlyHub that data has changed, not in the repository in this case
6:44 , but in the relay and he should be able to open up that folder, drag all those videos into Gleam, edit them, export them and then they should go back into a new folder in the relay which is going to be a little bit, probably the same name, but different to the one that we're using for S3 and then it
7:07 should just automatically come to my side and my FlyHub should instantaneously say, you've just received an edit from Jan and I, and then what I, my response is, shit, that's cool, shit yeah.
7:25 So I need you to program that shit yeah into the application we're building. Ha ha, just joking. Just program whatever you think is smart and ignore David's crap.
7:35 Now, this is the flows that we're going to be doing. Uh, I'm giving you the transcript now to start coming up with a plan of action for the FlyHub video and we'll be building it and then Jan and I will be figuring it out while I'm on a three hour bus ride over the border between Thailand and Laos.
7:55 How's that for mobile, uh, programming?