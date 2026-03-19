namespace ReadingTheReader.core.Domain;

public interface ISystemTime {
    long Now();
    DateTime NowAsDateTime();
}