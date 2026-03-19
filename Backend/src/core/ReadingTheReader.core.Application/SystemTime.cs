using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application;

public class SystemTime : ISystemTime{

    public long Now() {
        return DateTime.UtcNow.Ticks;
    }
    public DateTime NowAsDateTime() {
        return DateTime.UtcNow;
    }
}