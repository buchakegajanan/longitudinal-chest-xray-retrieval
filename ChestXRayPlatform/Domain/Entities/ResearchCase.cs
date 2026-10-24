namespace ChestXRayPlatform.Domain.Entities;

public class ResearchCase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? DatasetName { get; set; }
    public string DatasetPatientIdentifier { get; set; } = default!; // corresponds to Patient ID
}
