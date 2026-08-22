using Agaval.Inventory.Application.Common.Exceptions;
using Agaval.Inventory.Domain.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Agaval.Inventory.Api.Infrastructure;

internal sealed partial class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var problemDetails = CreateProblemDetails(exception);
        problemDetails.Instance = httpContext.Request.Path;
        problemDetails.Extensions["traceId"] = httpContext.TraceIdentifier;

        if (problemDetails.Status >= StatusCodes.Status500InternalServerError)
        {
            LogUnhandledError(logger, httpContext.TraceIdentifier, exception);
        }
        else
        {
            LogRejectedRequest(logger, httpContext.TraceIdentifier, exception);
        }

        httpContext.Response.StatusCode = problemDetails.Status ?? StatusCodes.Status500InternalServerError;

        return await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                ProblemDetails = problemDetails,
                Exception = exception,
            });
    }

    private static ProblemDetails CreateProblemDetails(Exception exception) => exception switch
    {
        ApplicationValidationException validationException => new HttpValidationProblemDetails(
            validationException.Errors.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal))
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "La solicitud no es válida.",
            Detail = validationException.Message,
        },
        DomainException domainException => new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "La regla de negocio no permite la operación.",
            Detail = domainException.Message,
        },
        NotFoundException notFoundException => new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Recurso no encontrado.",
            Detail = notFoundException.Message,
        },
        DbUpdateConcurrencyException => new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflicto de concurrencia.",
            Detail = "El registro cambió durante la operación. Actualice los datos e inténtelo nuevamente.",
        },
        _ => new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Ocurrió un error inesperado.",
            Detail = "La operación no pudo completarse. Use el traceId para consultar el registro del servidor.",
        },
    };

    [LoggerMessage(
        EventId = 1000,
        Level = LogLevel.Error,
        Message = "Error no controlado. TraceId: {TraceId}")]
    private static partial void LogUnhandledError(ILogger logger, string traceId, Exception exception);

    [LoggerMessage(
        EventId = 1001,
        Level = LogLevel.Warning,
        Message = "Solicitud rechazada. TraceId: {TraceId}")]
    private static partial void LogRejectedRequest(ILogger logger, string traceId, Exception exception);
}
