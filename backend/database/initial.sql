IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    CREATE TABLE [Categorias] (
        [Id] int NOT NULL IDENTITY,
        [Nombre] nvarchar(100) NOT NULL,
        [Activo] bit NOT NULL DEFAULT CAST(1 AS bit),
        CONSTRAINT [PK_Categorias] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    CREATE TABLE [Productos] (
        [Id] int NOT NULL IDENTITY,
        [Nombre] nvarchar(150) NOT NULL,
        [Descripcion] nvarchar(500) NULL,
        [Precio] decimal(10,2) NOT NULL,
        [Stock] int NOT NULL DEFAULT 0,
        [StockMinimo] int NOT NULL DEFAULT 5,
        [CategoriaId] int NOT NULL,
        [FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Productos] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Productos_Precio] CHECK ([Precio] > 0),
        CONSTRAINT [CK_Productos_Stock] CHECK ([Stock] >= 0),
        CONSTRAINT [CK_Productos_StockMinimo] CHECK ([StockMinimo] >= 0),
        CONSTRAINT [FK_Productos_Categorias] FOREIGN KEY ([CategoriaId]) REFERENCES [Categorias] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    CREATE TABLE [MovimientosInventario] (
        [Id] int NOT NULL IDENTITY,
        [ProductoId] int NOT NULL,
        [TipoMovimiento] nvarchar(10) NOT NULL,
        [Cantidad] int NOT NULL,
        [Fecha] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [Observacion] nvarchar(255) NULL,
        CONSTRAINT [PK_MovimientosInventario] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Movimientos_Cantidad] CHECK ([Cantidad] > 0),
        CONSTRAINT [CK_Movimientos_Tipo] CHECK ([TipoMovimiento] IN ('ENTRADA', 'SALIDA')),
        CONSTRAINT [FK_Movimientos_Productos] FOREIGN KEY ([ProductoId]) REFERENCES [Productos] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Activo', N'Nombre') AND [object_id] = OBJECT_ID(N'[Categorias]'))
        SET IDENTITY_INSERT [Categorias] ON;
    EXEC(N'INSERT INTO [Categorias] ([Id], [Activo], [Nombre])
    VALUES (1, CAST(1 AS bit), N''Electrónica''),
    (2, CAST(1 AS bit), N''Oficina''),
    (3, CAST(1 AS bit), N''Aseo'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Activo', N'Nombre') AND [object_id] = OBJECT_ID(N'[Categorias]'))
        SET IDENTITY_INSERT [Categorias] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CategoriaId', N'FechaCreacion', N'Descripcion', N'StockMinimo', N'Nombre', N'Precio', N'Stock') AND [object_id] = OBJECT_ID(N'[Productos]'))
        SET IDENTITY_INSERT [Productos] ON;
    EXEC(N'INSERT INTO [Productos] ([Id], [CategoriaId], [FechaCreacion], [Descripcion], [StockMinimo], [Nombre], [Precio], [Stock])
    VALUES (1, 1, ''2026-08-01T12:00:00.0000000Z'', N''Teclado compacto para estaciones de trabajo.'', 5, N''Teclado mecánico'', 249900.0, 4),
    (2, 2, ''2026-08-01T12:00:00.0000000Z'', N''Papel blanco de 75 gramos, paquete de 500 hojas.'', 8, N''Resma de papel carta'', 24500.0, 18)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CategoriaId', N'FechaCreacion', N'Descripcion', N'StockMinimo', N'Nombre', N'Precio', N'Stock') AND [object_id] = OBJECT_ID(N'[Productos]'))
        SET IDENTITY_INSERT [Productos] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [UX_Categorias_Nombre] ON [Categorias] ([Nombre]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Movimientos_ProductoId_Fecha] ON [MovimientosInventario] ([ProductoId], [Fecha]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Productos_CategoriaId] ON [Productos] ([CategoriaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Productos_FechaCreacion] ON [Productos] ([FechaCreacion]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822161607_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260822161607_InitialCreate', N'10.0.11');
END;

COMMIT;
GO
