# ximer

Music collaboration web application to record loops and then stitch together to make a song, which are posted to your ximer profile or to your soundcloud page, and much like github, you can also fork other users’ projects to edit.

Tracks are created and synthesized using an external library, Tone.js, then dynamically rendered on the DOM using AngularJS. 

Sound files are converted from base 64 data to .wav files, then stored in Amazon S3, and user and song related information stored on MongoDB using Node.js and Express. 
