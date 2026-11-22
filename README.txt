Saulė's portfolio: a small pixel game.

Title screen (img/title/)
  collage.jpg         the collage from Figma frame 1
  collage-pixel.png   the pixelated version from frame 2 (shown around the cursor)

Game art (img/world/). Hand-drawn placeholders: replace them with your own art at the SAME size.
  iso.png             the isometric island, 320 x 200
  main-ground.png     main path street with the three levels, 1100 x 180 (street top at y = 150)
  side-ground.png     side quests park, 900 x 180 (path top at y = 150)
  main-sky.png, main-far.png, side-sky.png, side-far.png
                      background layers, 480 x 180, they repeat sideways

If your new art puts things in different places, edit the numbers in CONFIG at the top of script.js:
where she stands at the fork, the walking route along each path, where the path labels sit,
the x position of every level / side quest stop, and the flag at the end of the main path
(reaching it takes her back to the island).

Photography: your originals live in portfoliography/ (kept out of git and off the website).
The album shows web copies, newest first, grouped by year: img/photography/NN.jpg (1600 px) and
img/photography/thumbs/NN.jpg (640 px). To add a photo, make both sizes (for example with
  sips -Z 1600 -s format jpeg -s formatOptions 72 in.jpg --out img/photography/45.jpg
  sips -Z 640 -s format jpeg -s formatOptions 68 in.jpg --out img/photography/thumbs/45.jpg)
and copy one of the <a class="pic"> lines in index.html (search for "photos-2026").
RAW files (.ARW, .NEF) were skipped: export them to JPEG first if you want them in.

The bowl on the title screen: CONFIG.bowl in script.js says where its water sits in the collage.

Fonts: Jeju Hallasan (fonts/, SIL Open Font License, cut down to Latin letters and renamed
"Hallasan Subset" as the licence asks), Jost and Pixelify Sans from Google Fonts.

Files the pages still look for in /media (anything missing is simply hidden):
  Saule_Pranculyte_CV.pdf, og.png, eldora.mp4, dhl-care.mp4, lekalas.mp4, cultural-alleys-logo.png
