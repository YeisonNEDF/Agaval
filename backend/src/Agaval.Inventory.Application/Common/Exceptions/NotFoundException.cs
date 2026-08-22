namespace Agaval.Inventory.Application.Common.Exceptions;

public sealed class NotFoundException : Exception
{
    public NotFoundException(string resourceName, object key)
        : base($"No se encontró {resourceName} con identificador '{key}'.")
    {
    }
}
