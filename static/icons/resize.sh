sizes=(384 192 152 144 128 96 72 180 152 144 120 114 76 72 57 32 64 256)
for size in ${sizes[*]}
do
    echo $size
    convert icon512.png -resize ${size}x${size} icon${size}.png
done

convert transparent/icon512.png -resize 32x32 transparent/favicon.ico
convert transparent/icon512.png -resize 128x128 transparent/icon128.png

cp icon512.png ../icon.png
cp transparent/favicon.ico ../favicon.ico

