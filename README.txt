Saulė's portfolio: a small pixel game.

Title screen (img/title/)
  collage.jpg         the collage from Figma frame 1
  collage-pixel.png   the pixelated version from frame 2 (shown around the cursor)
  reveal.svg          the stepped circle used for that reveal

Game art (img/world/). Hand-drawn placeholders: replace them with your own art at the SAME size.
  iso.png             the isometric island, 320 x 200
  main-ground.png     main path street with the three levels, 1100 x 180 (street top at y = 150)
  side-ground.png     side quests park, 900 x 180 (path top at y = 150)
  main-sky.png, main-far.png, side-sky.png, side-far.png
                      background layers, 480 x 180, they repeat sideways

If your new art puts things in different places, edit the numbers in CONFIG at the top of script.js:
where she stands at the fork, the walking route along each path, where the path labels sit,
and the x position of every level / side quest stop.

Photography: put five photos in img/photography/ named 01.jpg ... 05.jpg.
Edit their titles in index.html (search for "Photo 1"). Until then the album shows "photo coming soon".

Fonts: Jeju Hallasan (fonts/, SIL Open Font License, cut down to Latin letters and renamed
"Hallasan Subset" as the licence asks), Jost and Pixelify Sans from Google Fonts.

Files the pages still look for in /media (anything missing is simply hidden):
  cv.pdf, og.png, eldora.mp4, dhl-care.mp4, lekalas.mp4, cultural-alleys-logo.png
