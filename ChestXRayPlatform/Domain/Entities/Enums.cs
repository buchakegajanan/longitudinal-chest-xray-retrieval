namespace ChestXRayPlatform.Domain.Entities;

public enum Gender
{
    Male,
    Female,
    Unknown
}

public enum ViewPosition
{
    PA,
    AP,
    Lateral,
    Unknown
}

public enum ImageAvailabilityStatus
{
    NotAvailable,
    Available,
    Pending
}
