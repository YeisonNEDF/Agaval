using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Application.Features.InventoryMovements;
using Agaval.Inventory.Application.Features.InventoryMovements.GetList;
using Agaval.Inventory.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Agaval.Inventory.Api.Controllers;

[ApiController]
[Route("api/movimientos-inventario")]
public sealed class InventoryMovementsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<InventoryMovementDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<InventoryMovementDto>>> GetAll(
        [FromQuery] int? productoId = null,
        [FromQuery] StockMovementType? tipo = null,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanoPagina = 10,
        [FromQuery] SortDirection direccion = SortDirection.Descending,
        CancellationToken cancellationToken = default)
    {
        var movements = await sender
            .Send(
                new GetInventoryMovementsQuery(
                    productoId,
                    tipo,
                    pagina,
                    tamanoPagina,
                    direccion),
                cancellationToken)
            .ConfigureAwait(false);

        return Ok(movements);
    }
}
