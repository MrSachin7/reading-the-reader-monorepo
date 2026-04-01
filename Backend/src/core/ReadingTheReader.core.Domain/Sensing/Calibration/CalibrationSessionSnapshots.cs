namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public static class CalibrationSessionSnapshots
{
    public static CalibrationSessionSnapshot CreateIdle(string pattern = CalibrationPatterns.ScreenBasedNinePoint)
    {
        return new CalibrationSessionSnapshot(
            null,
            "idle",
            pattern,
            null,
            null,
            null,
            [],
            null,
            CreateIdleValidation(),
            []);
    }

    public static CalibrationValidationSnapshot CreateIdleValidation()
    {
        return new CalibrationValidationSnapshot(
            "idle",
            null,
            null,
            null,
            [],
            null,
            []);
    }

    public static bool IsApplied(CalibrationSessionSnapshot? snapshot)
    {
        return snapshot?.Result?.Applied == true;
    }

    public static bool IsReadyForSession(CalibrationSessionSnapshot? snapshot)
    {
        return snapshot?.Result?.Applied == true &&
               snapshot.Validation.Result?.Passed == true;
    }
}
