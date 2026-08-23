namespace Agaval.Inventory.Application.Common.Exceptions;

public sealed class ConflictException(string message) : Exception(message);
