# Use XeLaTeX - required by the fontspec package (Setup/Preamble.tex)
# -shell-escape is required by the svg package to invoke Inkscape.
# On Windows, prefer a user-local Inkscape install and make biber resolve files
# from the project directory explicitly. Other platforms can use their normal
# PATH/tool resolution unchanged.
if ($^O eq 'MSWin32') {
  $ENV{'PATH'} = "$ENV{'LOCALAPPDATA'}/Programs/Inkscape-local/PFiles64/Inkscape/bin;$ENV{'PATH'}";
  $ENV{'TEXMF_OUTPUT_DIRECTORY'} = '.';
  $biber = 'biber --input-directory . --output-directory . %O %B';
}

$pdf_mode = 5;
$pdflatex = 'xelatex -shell-escape %O %S';
$xelatex  = 'xelatex -shell-escape %O %S';

# Use biber for bibliography (biblatex backend)
$bibtex_use = 2;
