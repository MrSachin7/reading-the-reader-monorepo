namespace ReadingTheReader.core.Domain;

public class ReadingMaterial
{
    public Dictionary<int, string> PagedMarkdownText { get; set; }
    public int Fontsize { get; set; }
    public string FontType { get; set; }
    public int LetterSpacing { get; set; }
    public Dictionary<int, string> MarkdownQuestions { get; set; }
    

    public bool CanUserChangeSettingWhileReading { get; set; }
    
}