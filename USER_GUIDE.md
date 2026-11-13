# Guía de usuario

Esta guía describe las funciones disponibles en la versión actual. Los módulos marcados como «Pronto» en el menú
todavía no están disponibles.

## 1. Iniciar sesión

1. Abre la dirección de la aplicación e ingresa el correo y la contraseña asignados por tu administrador.
2. Usa el icono del ojo para mostrar u ocultar la contraseña.
3. Si olvidaste la contraseña, selecciona **¿Olvidaste tu contraseña?**. Recibirás un enlace por correo.
   El enlace expira; si no funciona, solicita otro.

No hay registro público. Las cuentas las crea o invita un administrador. Si tu cuenta no pertenece a ninguna
organización, verás la pantalla «Acceso pendiente».

## 2. Roles

| Rol | Puede |
|---|---|
| Consulta | Ver el inventario, el panel y las fichas. No modifica nada. |
| Editor | Lo anterior, más registrar y editar activos y guardar borradores. |
| Administrador | Lo anterior, más validar activos, configurar la entidad y publicar criterios. |

Los botones que no corresponden a tu rol no aparecen, y el servidor vuelve a comprobar cada acción.

## 3. Configurar la entidad (administrador)

Menú **Configuración**:

- **Entidad**: nombre, sigla, sector, responsable metodológico, alcance, normativa de referencia y **zona
  horaria**. La zona horaria define qué día es «hoy» para vencimientos.
- **Criterios de valoración**: umbrales de criticidad CIA, umbrales de riesgo y frecuencia de revisión.
  Al publicar, se crea una versión nueva y la anterior queda en el historial. Marca la casilla de aprobación
  solo si la dirección aprobó los criterios.

## 4. Registrar un activo

Menú **Inventario de activos → Nuevo activo**. El formulario tiene seis pasos:

1. **Identificación**: código (por ejemplo `AG-001`, único en la entidad), nombre, categoría, tipo, descripción.
2. **Contexto**: macroproceso, proceso, subproceso, área responsable, ubicación, proveedor.
3. **Responsabilidades**: propietario, custodio, administrador, usuarios autorizados, dependencias
   (códigos separados por `;`).
4. **Valoración CIA**: confidencialidad, integridad y disponibilidad (1–5). La criticidad se calcula al instante
   y explica qué dimensión la determinó. Justifica la valoración.
5. **Evidencias**: referencia documental, estado de evidencia, fuente, clasificación y referencia normativa.
6. **Revisión**: ciclo de vida y fecha de revisión. La próxima revisión se calcula sola. Al final ves la lista de
   requisitos pendientes.

Botones:

- **Guardar borrador**: guarda aunque falte información. El código es obligatorio.
- **Guardar registro**: exige código, nombre, categoría y tipo. El resto puede quedar pendiente; el estado
  mostrará «Incompleto».
- Mientras escribes un borrador, se guarda automáticamente unos segundos después de tu última modificación.
  Un registro ya guardado como registro no se guarda automáticamente.

### Estados del registro

- **Borrador**: no se ha completado el registro.
- **Incompleto**: faltan requisitos (la ficha los lista).
- **Listo para revisión**: cumple todos los requisitos.
- **Validado**: un administrador lo validó. Cualquier edición retira la validación.

Un propietario «Por identificar» no cuenta como propietario válido.

## 5. Inventario

- Busca por código o nombre.
- Filtra por categoría, área, criticidad, propietario, estado y clasificación.
- Ordena por código, nombre, criticidad o próxima revisión.
- Usa **Mostrar archivados** para ver los activos archivados.
- Los filtros quedan en la dirección de la página, así que puedes compartir la vista.

Desde la fila puedes ver la ficha, editar o archivar. **Archivar** oculta el activo sin borrar su historial.
Pide confirmación. No hay borrado físico.

### Ficha del activo

Muestra todos los campos organizados por contexto, la valoración CIA con su explicación, las dependencias, la
lista de requisitos pendientes y la trazabilidad (creación, modificación y validación).

## 6. Panel ejecutivo

El panel usa solo datos de tu entidad. Cada indicador enlaza al listado que lo compone.

- **Filtros**: área y categoría. Todos los indicadores y gráficos responden a ellos.
- **Indicadores principales**: activos registrados, listos, incompletos, criticidad alta, sin propietario,
  revisiones vencidas, riesgos registrados y controles verificados.
- **Gráficos**: categorías, criticidad, calidad del inventario, áreas, riesgos y estado de controles y seguimiento.
- **Prioridades de atención**: situaciones detectadas por reglas (por ejemplo, activos críticos sin propietario).
  Cada una indica cuántos registros afecta y qué hacer.

Si no hay datos, el panel muestra un estado vacío con orientación, no cifras de ejemplo.

## 7. Limitaciones actuales

- Riesgos, controles, seguimiento, fuentes y evidencias, reportes y Excel: pendientes.
- Gestión de usuarios desde la aplicación: pendiente; hoy se crean con el script de arranque.
- Edición de catálogos: pendiente; se consultan en Configuración.
- Los filtros del panel no incluyen periodo.
