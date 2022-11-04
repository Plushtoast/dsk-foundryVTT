#/usr/bin/bash
# extract images from pdf at first-hand
#prefix=pict
#echo extract images from "$1"
#pdfimages -png "$1" $prefix
# IMAGES ARE SAVED SECVENTIALLY AS IMAGE AND THE NEXT IS A MASK IMAGE !!!!
declare -a files=($(ls *.png))
image=
for (( i = 0; i < ${#files[*]}; i = i +1 ))
do
  image="${files[$i]}"
  echo trying converting "${image%.*}".png
  IFS=" x+" read w h x y < <(convert -fuzz 10% "${image}" -format "%@" info:)
  echo converting "${image%.*}".png

  longest=$w
  [ $h -gt $longest ] && longest=$h

  convert -fuzz 10% "${image}" -trim -background transparent -gravity center -extent ${longest}x${longest} "square/${image}"

done

echo done!