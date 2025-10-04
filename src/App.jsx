import { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Grid,
} from "@mui/material";

import ClearIcon from "@mui/icons-material/Clear";
import { DataGrid } from "@mui/x-data-grid";
import {
  createCliente,
  getClientes,
  actualizarClientePorTelefono,
  borrarClientePorTelefono,
  existeTelefono,
  registrarVenta,
  getVentasCliente,
  buscarClientePorTelefono,
} from "./services/api";

const App = () => {
  const [nombre, setNombre] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [telefono, setTelefono] = useState("");
  const [clientes, setClientes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [editable, setEditable] = useState(false);
  const [telefonoOriginal, setTelefonoOriginal] = useState("");
  const [searchText, setSearchText] = useState("");
  const [ventaTotal, setVentaTotal] = useState("");
  const [puntosUsar, setPuntosUsar] = useState("");
  const [ventasHistorial, setVentasHistorial] = useState([]);

  // Estados para flujo rápido por teléfono
  const [quickPhone, setQuickPhone] = useState("");
  const [quickSearching, setQuickSearching] = useState(false);
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [newClientNombre, setNewClientNombre] = useState("");
  const [newClientApellidoP, setNewClientApellidoP] = useState("");
  const [newClientApellidoM, setNewClientApellidoM] = useState("");
  const [newClientTelefono, setNewClientTelefono] = useState("");
  const [newClientVentaTotal, setNewClientVentaTotal] = useState("");
  const [newClientPuntosUsar, setNewClientPuntosUsar] = useState("");

  const [addErrors, setAddErrors] = useState({ nombre: false, telefono: false });
  const [addHelper, setAddHelper] = useState({ nombre: "", telefono: "" });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getClientes();
      if (!mounted) return;
      const dataConNombre = data.map((c, i) => {
        const nombreVal = c.nombre ?? "";
        const apP = c.apellidoPaterno ?? "";
        const apM = c.apellidoMaterno ?? "";
        const nombreCompleto = [nombreVal, apP, apM].filter(Boolean).join(" ").trim() || "(Sin nombre)";
        return {
          ...c,
          nombre: nombreVal,
          apellidoPaterno: apP,
          apellidoMaterno: apM,
          nombreCompleto,
          id: c.id ?? c.telefono ?? `row-${i}`,
        };
      });
      setClientes(dataConNombre);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const showClientes = async () => {
    const data = await getClientes();
    const dataConNombre = data.map((c, i) => {
      const nombreVal = c.nombre ?? "";
      const apP = c.apellidoPaterno ?? "";
      const apM = c.apellidoMaterno ?? "";
      const nombreCompleto = [nombreVal, apP, apM].filter(Boolean).join(" ").trim() || "(Sin nombre)";
      return {
        ...c,
        nombre: nombreVal,
        apellidoPaterno: apP,
        apellidoMaterno: apM,
        nombreCompleto,
        id: c.id ?? c.telefono ?? `row-${i}`,
      };
    });
    setClientes(dataConNombre);
  };

  const resetAddValidation = () => {
    setAddErrors({ nombre: false, telefono: false });
    setAddHelper({ nombre: "", telefono: "" });
  };

  const handleAddCliente = async () => {
    resetAddValidation();

    let hasError = false;
    if (!nombre.trim()) {
      setAddErrors((s) => ({ ...s, nombre: true }));
      setAddHelper((s) => ({ ...s, nombre: "El nombre es obligatorio" }));
      hasError = true;
    }
    if (!telefono || telefono.length !== 10) {
      setAddErrors((s) => ({ ...s, telefono: true }));
      setAddHelper((s) => ({ ...s, telefono: "El teléfono debe tener 10 dígitos" }));
      hasError = true;
    }
    if (hasError) return;

    const existe = await existeTelefono(telefono.toString().trim());
    if (existe) {
      setAddErrors((s) => ({ ...s, telefono: true }));
      setAddHelper((s) => ({ ...s, telefono: "Ese número ya está registrado" }));
      return;
    }

    await createCliente({
      nombre: nombre.trim(),
      apellidoPaterno: apellidoPaterno.trim(),
      apellidoMaterno: apellidoMaterno.trim(),
      telefono: telefono.toString().trim(),
      puntos: 0,
      sobrante: 0,
    });

    setNombre("");
    setApellidoPaterno("");
    setApellidoMaterno("");
    setTelefono("");
    resetAddValidation();
    await showClientes();
  };

  const handleVerCliente = async (cliente) => {
    const clienteConNombre = {
      ...cliente,
      nombre: cliente.nombre ?? "",
      apellidoPaterno: cliente.apellidoPaterno ?? "",
      apellidoMaterno: cliente.apellidoMaterno ?? "",
      nombreCompleto:
        cliente.nombreCompleto ||
        [cliente.nombre ?? "", cliente.apellidoPaterno ?? "", cliente.apellidoMaterno ?? ""].filter(Boolean).join(" ").trim() ||
        "(Sin nombre)",
    };
    setClienteSeleccionado(clienteConNombre);
    setEditable(false);
    setTelefonoOriginal(cliente.telefono);
    setModalOpen(true);

    const historial = await getVentasCliente(cliente.id);
    setVentasHistorial(historial || []);
    setPuntosUsar("");
    setVentaTotal("");
  };

  const handleEditar = () => setEditable(true);

  const handleGuardar = async () => {
    if (!clienteSeleccionado) return;

    if (!clienteSeleccionado.nombre || !clienteSeleccionado.telefono) {
      alert("Nombre y teléfono son obligatorios");
      return;
    }
    if (clienteSeleccionado.telefono.length !== 10) {
      alert("El número de teléfono debe tener exactamente 10 dígitos");
      return;
    }

    if (clienteSeleccionado.telefono !== telefonoOriginal) {
      const existe = await existeTelefono(clienteSeleccionado.telefono);
      if (existe) {
        alert("Ese número ya está registrado con otro cliente");
        return;
      }
    }

    await actualizarClientePorTelefono(telefonoOriginal, {
      nombre: clienteSeleccionado.nombre,
      apellidoPaterno: clienteSeleccionado.apellidoPaterno,
      apellidoMaterno: clienteSeleccionado.apellidoMaterno,
      telefono: clienteSeleccionado.telefono,
    });

    alert("Cliente actualizado");
    setModalOpen(false);
    setEditable(false);
    await showClientes();
  };

  const handleBorrarCliente = async () => {
    if (!clienteSeleccionado) return;
    const confirmDelete = window.confirm("¿Seguro que quieres borrar este cliente?");
    if (!confirmDelete) return;
    await borrarClientePorTelefono(clienteSeleccionado.telefono);
    alert("Cliente borrado");
    setModalOpen(false);
    await showClientes();
  };

  // Registrar venta y actualizar puntos (usa api.registrarVenta que acepta puntosUsados)
  const handleRegistrarVenta = async () => {
    if (!ventaTotal || isNaN(ventaTotal) || Number(ventaTotal) <= 0) {
      alert("Ingresa un total válido");
      return;
    }
    if (!clienteSeleccionado) {
      alert("Selecciona un cliente");
      return;
    }

    const total = Number(ventaTotal);
    const puntosAUsar = Number(puntosUsar) || 0;

    if (puntosAUsar > (clienteSeleccionado.puntos || 0)) {
      alert("No puedes usar más puntos de los que tienes");
      return;
    }
    if (puntosAUsar > total) {
      alert("No puedes usar más puntos que el total de la venta");
      return;
    }

    try {
      const resultado = await registrarVenta(clienteSeleccionado.id, total, puntosAUsar);

      alert(
        `Venta registrada ✅\nUsó ${resultado.puntosUsados} puntos\nGanó ${resultado.puntosGanados} puntos\nTotal pagado: $${resultado.totalPagado}`
      );

      setClienteSeleccionado({
        ...clienteSeleccionado,
        puntos: resultado.nuevosPuntosTotales,
      });

      setVentaTotal("");
      setPuntosUsar("");

      setVentasHistorial((prev) => [
        ...prev,
        {
          fecha: new Date().toISOString(),
          total,
          totalPagado: resultado.totalPagado,
          puntosUsados: resultado.puntosUsados,
          puntosGanados: resultado.puntosGanados,
        },
      ]);

      await showClientes();
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al registrar la venta");
    }
  };

  // --- FUNCIONES PARA FLUJO RÁPIDO POR TELÉFONO ---

  const handleBuscarPorTelefonoQuick = async () => {
    const tel = quickPhone.replace(/\D/g, "").slice(0, 10);
    if (!tel || tel.length !== 10) {
      alert("Ingresa un teléfono válido de 10 dígitos");
      return;
    }

    setQuickSearching(true);
    try {
      const found = await buscarClientePorTelefono(tel);

      // LIMPIAR el campo de búsqueda rápido siempre
      setQuickPhone("");

      if (found) {
        // abrir modal del cliente existente
        setClienteSeleccionado({
          ...found,
          nombre: found.nombre ?? "",
          apellidoPaterno: found.apellidoPaterno ?? "",
          apellidoMaterno: found.apellidoMaterno ?? "",
          nombreCompleto:
            found.nombreCompleto ||
            [found.nombre ?? "", found.apellidoPaterno ?? "", found.apellidoMaterno ?? ""].filter(Boolean).join(" ").trim() ||
            "(Sin nombre)",
        });
        setTelefonoOriginal(found.telefono);
        setModalOpen(true);
        const historial = await getVentasCliente(found.id);
        setVentasHistorial(historial || []);
        setPuntosUsar("");
        setVentaTotal("");
      } else {
        // preparar diálogo para crear cliente y registrar venta
        setNewClientTelefono(tel);
        setNewClientNombre("");
        setNewClientApellidoP("");
        setNewClientApellidoM("");
        setNewClientVentaTotal("");
        setNewClientPuntosUsar("");
        setNewClientDialogOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al buscar el teléfono");
    } finally {
      setQuickSearching(false);
    }
  };

  // Crear cliente mínimo y registrar venta en un solo flujo
  const handleCrearClienteYNuevaVenta = async () => {
    const tel = newClientTelefono.replace(/\D/g, "").slice(0, 10);
    if (!tel || tel.length !== 10) {
      alert("Ingresa un teléfono válido de 10 dígitos");
      return;
    }
    const totalNum = Number(newClientVentaTotal);
    if (!totalNum || isNaN(totalNum) || totalNum <= 0) {
      alert("Ingresa un total de venta válido");
      return;
    }
    const puntosAUsar = Number(newClientPuntosUsar) || 0;
    if (puntosAUsar > totalNum) {
      alert("No puedes usar más puntos que el total de la venta");
      return;
    }

    try {
      // crear cliente (puntos y sobrante inicial)
      const newId = await createCliente({
        nombre: newClientNombre.trim(),
        apellidoPaterno: newClientApellidoP.trim(),
        apellidoMaterno: newClientApellidoM.trim(),
        telefono: tel,
        puntos: 0,
        sobrante: 0,
      });

      // registrar la venta usando el id recién creado
      const resultado = await registrarVenta(newId, totalNum, puntosAUsar);

      alert(
        `Cliente creado y venta registrada ✅\nUsó ${resultado.puntosUsados} puntos\nGanó ${resultado.puntosGanados} puntos\nTotal pagado: $${resultado.totalPagado}`
      );

      // actualizar UI: seleccionar cliente nuevo con puntos actualizados
      setClienteSeleccionado({
        id: newId,
        nombre: newClientNombre.trim(),
        apellidoPaterno: newClientApellidoP.trim(),
        apellidoMaterno: newClientApellidoM.trim(),
        telefono: tel,
        puntos: resultado.nuevosPuntosTotales,
        nombreCompleto:
          [newClientNombre.trim(), newClientApellidoP.trim(), newClientApellidoM.trim()].filter(Boolean).join(" ") ||
          "(Sin nombre)",
      });

      setVentasHistorial((prev) => [
        ...prev,
        {
          fecha: new Date().toISOString(),
          total: totalNum,
          totalPagado: resultado.totalPagado,
          puntosUsados: resultado.puntosUsados,
          puntosGanados: resultado.puntosGanados,
        },
      ]);

      setNewClientDialogOpen(false);
      setQuickPhone("");
      await showClientes();
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al crear el cliente o registrar la venta");
    }
  };

  const columns = [
    { field: "nombreCompleto", headerName: "Nombre", flex: 1, minWidth: 180 },
    { field: "telefono", headerName: "Teléfono", flex: 0.6, minWidth: 120 },
    {
      field: "ver",
      headerName: "Acciones",
      flex: 0.6,
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <Button variant="outlined" onClick={() => handleVerCliente(params.row)}>
          VER
        </Button>
      ),
    },
  ];

  const filteredClientes = clientes.filter((c) => {
    const texto = searchText.trim().toLowerCase();
    if (!texto) return true;
    const nombreMatch = (c.nombreCompleto || "").toLowerCase().includes(texto);
    const telefonoMatch = (c.telefono || "").includes(texto);
    return nombreMatch || telefonoMatch;
  });

  const clearSearch = () => setSearchText("");

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Gestión de Clientes
      </Typography>

      {/* Área rápida: buscar por teléfono y registrar venta */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Registrar venta por teléfono
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Teléfono del cliente"
            value={quickPhone}
            onChange={(e) => setQuickPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }}
            fullWidth
          />
          <Button variant="contained" onClick={handleBuscarPorTelefonoQuick} disabled={quickSearching}>
            Buscar / Registrar venta
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Si el cliente existe, se abrirá su ficha. Si no existe, podrás crearlo y registrar la venta.
        </Typography>
      </Paper>

      {/* Formulario Añadir Cliente (resto igual que antes) */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Añadir Cliente
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nombre"
              variant="outlined"
              fullWidth
              value={nombre}
              error={addErrors.nombre}
              helperText={addHelper.nombre}
              onChange={(e) => setNombre(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Apellido Paterno"
              variant="outlined"
              fullWidth
              value={apellidoPaterno}
              onChange={(e) => setApellidoPaterno(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Apellido Materno"
              variant="outlined"
              fullWidth
              value={apellidoMaterno}
              onChange={(e) => setApellidoMaterno(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Teléfono"
              variant="outlined"
              fullWidth
              value={telefono}
              error={addErrors.telefono}
              helperText={addHelper.telefono}
              inputProps={{
                maxLength: 10,
                inputMode: "numeric",
                pattern: "[0-9]*",
              }}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setTelefono(value);
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} container alignItems="center">
            <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
              <Button variant="contained" color="primary" onClick={handleAddCliente} fullWidth>
                Añadir
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  setNombre("");
                  setApellidoPaterno("");
                  setApellidoMaterno("");
                  setTelefono("");
                  resetAddValidation();
                }}
                fullWidth
              >
                Limpiar
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Buscador con botón limpiar */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          label="Buscar cliente por nombre o teléfono"
          variant="outlined"
          fullWidth
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <IconButton onClick={clearSearch} title="Limpiar búsqueda">
          <ClearIcon />
        </IconButton>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ p: 2 }}>
        <div style={{ width: "100%" }}>
          <DataGrid
            rows={filteredClientes.map((c, i) => ({ ...c, id: c.id ?? c.telefono ?? `row-${i}` }))}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5, 10, 20]}
            disableSelectionOnClick
            autoHeight
          />
        </div>
      </Paper>

      {/* Modal cliente existente */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Información del Cliente</DialogTitle>
        <DialogContent>
          {clienteSeleccionado && (
            <>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Nombre"
                  value={clienteSeleccionado.nombre}
                  disabled={!editable}
                  onChange={(e) =>
                    setClienteSeleccionado({
                      ...clienteSeleccionado,
                      nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""),
                    })
                  }
                />
                <TextField
                  label="Apellido Paterno"
                  value={clienteSeleccionado.apellidoPaterno || ""}
                  disabled={!editable}
                  onChange={(e) =>
                    setClienteSeleccionado({
                      ...clienteSeleccionado,
                      apellidoPaterno: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""),
                    })
                  }
                />
                <TextField
                  label="Apellido Materno"
                  value={clienteSeleccionado.apellidoMaterno || ""}
                  disabled={!editable}
                  onChange={(e) =>
                    setClienteSeleccionado({
                      ...clienteSeleccionado,
                      apellidoMaterno: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""),
                    })
                  }
                />
                <TextField
                  label="Teléfono"
                  value={clienteSeleccionado.telefono}
                  inputProps={{ maxLength: 10, inputMode: "numeric", pattern: "[0-9]*" }}
                  disabled={!editable}
                  onChange={(e) =>
                    setClienteSeleccionado({ ...clienteSeleccionado, telefono: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                />
                <Typography variant="subtitle1">Puntos actuales: {clienteSeleccionado.puntos || 0}</Typography>
              </Stack>

              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1">Registrar Venta</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Total de venta ($)"
                    value={ventaTotal}
                    onChange={(e) => setVentaTotal(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                  <TextField
                    label="Puntos a usar"
                    value={puntosUsar}
                    onChange={(e) => setPuntosUsar(e.target.value.replace(/[^0-9]/g, ""))}
                    helperText={`Tienes ${clienteSeleccionado.puntos || 0} puntos disponibles`}
                  />
                  <Button variant="contained" color="success" onClick={handleRegistrarVenta}>
                    Registrar
                  </Button>
                </Stack>
              </Paper>

              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1">Historial de Ventas</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Pagado</TableCell>
                      <TableCell>Puntos usados</TableCell>
                      <TableCell>Puntos ganados</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventasHistorial.map((v, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(v.fecha).toLocaleString()}</TableCell>
                        <TableCell>{v.total}</TableCell>
                        <TableCell>{v.totalPagado ?? v.total}</TableCell>
                        <TableCell>{v.puntosUsados ?? 0}</TableCell>
                        <TableCell>{v.puntosGanados}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cerrar</Button>
          {!editable && <Button color="primary" onClick={handleEditar}>Editar</Button>}
          {editable && <Button color="success" onClick={handleGuardar}>Guardar</Button>}
          <Button color="error" onClick={handleBorrarCliente}>Borrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para crear cliente rápido y registrar su venta (cuando el teléfono no existe) */}
      <Dialog open={newClientDialogOpen} onClose={() => setNewClientDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Crear cliente y registrar venta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Teléfono"
              value={newClientTelefono}
              inputProps={{ maxLength: 10, inputMode: "numeric", pattern: "[0-9]*" }}
              onChange={(e) => setNewClientTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            <TextField
              label="Nombre (opcional)"
              value={newClientNombre}
              onChange={(e) => setNewClientNombre(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
            />
            <TextField
              label="Apellido Paterno (opcional)"
              value={newClientApellidoP}
              onChange={(e) => setNewClientApellidoP(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
            />
            <TextField
              label="Apellido Materno (opcional)"
              value={newClientApellidoM}
              onChange={(e) => setNewClientApellidoM(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
            />
            <Typography variant="subtitle2">Registrar venta</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Total de venta ($)"
                value={newClientVentaTotal}
                onChange={(e) => setNewClientVentaTotal(e.target.value.replace(/[^0-9.]/g, ""))}
              />
              <TextField
                label="Puntos a usar"
                value={newClientPuntosUsar}
                onChange={(e) => setNewClientPuntosUsar(e.target.value.replace(/[^0-9]/g, ""))}
                helperText="Al crear, el cliente no tendrá puntos, salvo que quieras establecer manualmente"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewClientDialogOpen(false)}>Cancelar</Button>
          <Button color="primary" onClick={handleCrearClienteYNuevaVenta}>Crear y registrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default App;
