#!/usr/bin/env node

const apiBaseUrl = (process.argv[2] ?? 'http://localhost:5100').replace(/\/$/, '');
const frontendBaseUrl = (process.argv[3] ?? 'http://localhost:4200').replace(/\/$/, '');
const username = process.env.AUTH_USERNAME ?? 'admin';
const password = process.env.AUTH_PASSWORD ?? 'Agaval_admin_2026!';
const proxyApiUrl = `${frontendBaseUrl}/api`;

let accessToken = null;
let categoryId = null;
let productId = null;
let createdProductIds = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') ?? '';
  const body = response.status === 204
    ? null
    : contentType.includes('json')
      ? await response.json()
      : await response.text();
  return { response, body };
}

function authorizedOptions(method, body) {
  return {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

async function expectStatus(url, expectedStatus, options = {}) {
  const result = await request(url, options);
  assert(
    result.response.status === expectedStatus,
    `${options.method ?? 'GET'} ${url}: se esperaba ${expectedStatus} y llegó ` +
      `${result.response.status}. Respuesta: ${JSON.stringify(result.body)}`,
  );
  return result.body;
}

async function waitForHttp(url, attempts = 90) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await request(url);
      if (result.response.status === 200) {
        return;
      }
    } catch {
      // El proceso o el proxy todavía están iniciando.
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`${url} no respondió HTTP 200 dentro del tiempo esperado.`);
}

async function verifySpaRoute(path) {
  const result = await request(`${frontendBaseUrl}${path}`);
  assert(result.response.status === 200, `${path} no devolvió HTTP 200.`);
  assert(
    typeof result.body === 'string' && result.body.includes('<app-root'),
    `${path} no devolvió el shell Angular.`,
  );
}

async function cleanup() {
  if (accessToken === null) {
    return;
  }

  for (const createdProductId of [...createdProductIds].reverse()) {
    await request(
      `${proxyApiUrl}/productos/${createdProductId}`,
      authorizedOptions('DELETE'),
    ).catch(() => undefined);
  }
  if (categoryId !== null) {
    await request(
      `${proxyApiUrl}/categorias/${categoryId}`,
      authorizedOptions('DELETE'),
    ).catch(() => undefined);
  }
}

try {
  await waitForHttp(`${apiBaseUrl}/health`);
  await waitForHttp(`${frontendBaseUrl}/health`);
  for (const path of [
    '/',
    '/productos',
    '/productos/stock-bajo',
    '/movimientos',
    '/categorias',
    '/login',
  ]) {
    await verifySpaRoute(path);
  }

  await expectStatus(`${proxyApiUrl}/autenticacion/login`, 401, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'credencial-incorrecta' }),
  });
  await expectStatus(`${proxyApiUrl}/categorias`, 401, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sin autorización' }),
  });

  const session = await expectStatus(`${proxyApiUrl}/autenticacion/login`, 200, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert(typeof session.accessToken === 'string', 'El login no devolvió accessToken.');
  assert(session.role === 'InventoryManager', 'El login no devolvió el rol esperado.');
  accessToken = session.accessToken;

  const suffix = `${Date.now()}-${process.pid}`;
  const category = await expectStatus(
    `${proxyApiUrl}/categorias`,
    201,
    authorizedOptions('POST', { name: `QA ${suffix}` }),
  );
  categoryId = category.id;
  assert(category.name === `QA ${suffix}`, 'La categoría no conservó su nombre.');

  await expectStatus(
    `${proxyApiUrl}/categorias`,
    409,
    authorizedOptions('POST', { name: `qa ${suffix}` }),
  );
  const updatedCategory = await expectStatus(
    `${proxyApiUrl}/categorias/${categoryId}`,
    200,
    authorizedOptions('PUT', { name: `QA Editada ${suffix}`, isActive: true }),
  );
  assert(updatedCategory.name === `QA Editada ${suffix}`, 'La categoría no se actualizó.');

  const product = await expectStatus(
    `${proxyApiUrl}/productos`,
    201,
    authorizedOptions('POST', {
      name: `Producto QA ${suffix}`,
      description: 'Validación integral automatizada',
      price: 159900,
      stock: 2,
      minimumStock: 5,
      categoryId,
    }),
  );
  productId = product.id;
  createdProductIds.push(product.id);
  assert(product.isLowStock === true, 'El producto debía iniciar con stock bajo.');

  const detail = await expectStatus(`${proxyApiUrl}/productos/${productId}`, 200);
  assert(detail.id === productId, 'La consulta por id devolvió otro producto.');

  const page = await expectStatus(
    `${proxyApiUrl}/productos?categoriaId=${categoryId}&stock=low&buscar=Producto%20QA` +
      '&pagina=1&tamanoPagina=5&ordenarPor=Price&direccion=Descending',
    200,
  );
  assert(page.totalCount === 1 && page.items[0]?.id === productId, 'La página filtrada es incorrecta.');
  assert(page.pageNumber === 1 && page.pageSize === 5, 'Los metadatos de página son incorrectos.');

  const extraProductIds = [];
  for (let index = 1; index <= 4; index += 1) {
    const extraProduct = await expectStatus(
      `${proxyApiUrl}/productos`,
      201,
      authorizedOptions('POST', {
        name: `Producto extra ${index} ${suffix}`,
        description: 'Registro temporal para comprobar la paginación real',
        price: 20_000 + index,
        stock: 10,
        minimumStock: 5,
        categoryId,
      }),
    );
    extraProductIds.push(extraProduct.id);
    createdProductIds.push(extraProduct.id);
  }

  const firstPage = await expectStatus(
    `${proxyApiUrl}/productos?pagina=1&tamanoPagina=5&ordenarPor=Name&direccion=Ascending`,
    200,
  );
  const secondPage = await expectStatus(
    `${proxyApiUrl}/productos?pagina=2&tamanoPagina=5&ordenarPor=Name&direccion=Ascending`,
    200,
  );
  assert(
    firstPage.items.length === 5 && firstPage.hasNextPage === true && firstPage.totalPages >= 2,
    'La primera página no expuso metadatos de navegación coherentes.',
  );
  assert(
    secondPage.items.length >= 1 &&
      !firstPage.items.some((item) => item.id === secondPage.items[0]?.id),
    'La segunda página repitió un resultado de la primera.',
  );

  const lowStock = await expectStatus(`${proxyApiUrl}/productos/stock-bajo`, 200);
  assert(lowStock.some((item) => item.id === productId), 'El endpoint de stock bajo omitió el producto.');

  const updatedProduct = await expectStatus(
    `${proxyApiUrl}/productos/${productId}`,
    200,
    authorizedOptions('PUT', {
      name: `Producto QA Editado ${suffix}`,
      description: 'Producto actualizado',
      price: 169900,
      stock: 2,
      minimumStock: 5,
      categoryId,
    }),
  );
  assert(updatedProduct.name.includes('Editado'), 'El producto no se actualizó.');

  const afterEntry = await expectStatus(
    `${proxyApiUrl}/productos/${productId}/ajustes-stock`,
    200,
    authorizedOptions('POST', { type: 'Entry', quantity: 5, observation: 'Entrada QA' }),
  );
  assert(afterEntry.stock === 7, 'La entrada no incrementó correctamente el stock.');

  const afterExit = await expectStatus(
    `${proxyApiUrl}/productos/${productId}/ajustes-stock`,
    200,
    authorizedOptions('POST', { type: 'Exit', quantity: 3, observation: 'Salida QA' }),
  );
  assert(afterExit.stock === 4, 'La salida no redujo correctamente el stock.');
  await expectStatus(
    `${proxyApiUrl}/productos/${productId}/ajustes-stock`,
    400,
    authorizedOptions('POST', { type: 'Exit', quantity: 999, observation: 'Inválida' }),
  );

  const movements = await expectStatus(
    `${proxyApiUrl}/movimientos-inventario?productoId=${productId}&pagina=1&tamanoPagina=10`,
    200,
  );
  assert(movements.totalCount === 2, 'El historial no contiene los dos movimientos válidos.');
  assert(
    movements.items.some((item) => item.type === 'Entry') &&
      movements.items.some((item) => item.type === 'Exit'),
    'El historial no contiene entrada y salida.',
  );
  const entryMovements = await expectStatus(
    `${proxyApiUrl}/movimientos-inventario?productoId=${productId}` +
      '&tipo=Entry&pagina=1&tamanoPagina=10',
    200,
  );
  assert(
    entryMovements.totalCount === 1 && entryMovements.items[0]?.type === 'Entry',
    'El filtro de movimientos por tipo no devolvió únicamente la entrada.',
  );

  const summary = await expectStatus(`${proxyApiUrl}/productos/resumen`, 200);
  assert(summary.totalProducts >= 1, 'El resumen no contabilizó el producto temporal.');

  await expectStatus(
    `${proxyApiUrl}/categorias/${categoryId}`,
    409,
    authorizedOptions('DELETE'),
  );
  await expectStatus(
    `${proxyApiUrl}/productos/${productId}`,
    204,
    authorizedOptions('DELETE'),
  );
  createdProductIds = createdProductIds.filter((id) => id !== productId);
  productId = null;
  await expectStatus(`${proxyApiUrl}/productos/${product.id}`, 404);
  for (const extraProductId of extraProductIds) {
    await expectStatus(
      `${proxyApiUrl}/productos/${extraProductId}`,
      204,
      authorizedOptions('DELETE'),
    );
    createdProductIds = createdProductIds.filter((id) => id !== extraProductId);
  }
  await expectStatus(
    `${proxyApiUrl}/categorias/${categoryId}`,
    204,
    authorizedOptions('DELETE'),
  );
  const deletedCategoryId = categoryId;
  categoryId = null;
  await expectStatus(`${proxyApiUrl}/categorias/${deletedCategoryId}`, 404);

  console.log('E2E OK: Angular/Nginx -> API -> JWT/CQRS -> SQL Server.');
  console.log('E2E OK: CRUD productos/categorías, stock, movimientos, filtros y paginación.');
} catch (error) {
  await cleanup();
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
