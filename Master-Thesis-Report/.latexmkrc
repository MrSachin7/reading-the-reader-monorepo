# Use XeLaTeX — required by the fontspec package (Setup/Preamble.tex)
# -shell-escape is required by the svg package to invoke Inkscape (Chapters/05_SystemDesign/5.2.svg)
$pdf_mode = 5;
$pdflatex = 'xelatex -shell-escape %O %S';
$xelatex  = 'xelatex -shell-escape %O %S';

# Use biber for bibliography (biblatex backend)
$bibtex_use = 2;
