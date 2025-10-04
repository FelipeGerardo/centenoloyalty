import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  limit,
  increment,
} from "firebase/firestore";

const clientesCollection = "clientes";

// ----------------- CLIENTES -----------------

// Crear cliente (asegura campos iniciales)
export const createCliente = async (obj) => {
  const colRef = collection(db, clientesCollection);
  const payload = {
    nombre: obj.nombre ?? "",
    apellidoPaterno: obj.apellidoPaterno ?? "",
    apellidoMaterno: obj.apellidoMaterno ?? "",
    telefono: obj.telefono ?? "",
    puntos: obj.puntos ?? 0,
    sobrante: obj.sobrante ?? 0,
    visitas: obj.visitas ?? 0,
    lastVisit: obj.lastVisit ?? null,
  };
  const data = await addDoc(colRef, payload);
  return data.id;
};

// Obtener todos los clientes
export const getClientes = async () => {
  const colRef = collection(db, clientesCollection);
  const result = await getDocs(query(colRef));
  return result.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Buscar cliente por teléfono
export const buscarClientePorTelefono = async (telefono) => {
  if (!telefono) return null;
  const colRef = collection(db, clientesCollection);
  const q = query(colRef, where("telefono", "==", telefono));
  const result = await getDocs(q);
  return result.empty ? null : { id: result.docs[0].id, ...result.docs[0].data() };
};

// Actualizar cliente por teléfono
export const actualizarClientePorTelefono = async (telefono, updatedData) => {
  const cliente = await buscarClientePorTelefono(telefono);
  if (!cliente) return null;
  const docRef = doc(db, clientesCollection, cliente.id);
  await updateDoc(docRef, updatedData);
  return cliente.id;
};

// Borrar cliente por teléfono (también borra subcolección `ventas`)
export const borrarClientePorTelefono = async (telefono) => {
  const cliente = await buscarClientePorTelefono(telefono);
  if (!cliente) return null;

  const clienteRef = doc(db, clientesCollection, cliente.id);

  // Borra la subcolección "ventas" en batches (hasta 500 por batch)
  const ventasColRef = collection(clienteRef, "ventas");

  const borrarVentasEnBatches = async () => {
    while (true) {
      const snap = await getDocs(query(ventasColRef, limit(500)));
      if (snap.empty) break;

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        const ventaDocRef = doc(ventasColRef, d.id);
        batch.delete(ventaDocRef);
      });
      await batch.commit();

      if (snap.size < 500) break;
    }
  };

  await borrarVentasEnBatches();

  // Finalmente borrar el documento del cliente
  await deleteDoc(clienteRef);

  return cliente.id;
};

// Verificar si teléfono existe
export const existeTelefono = async (telefono) => {
  const cliente = await buscarClientePorTelefono(telefono);
  return !!cliente;
};

// ----------------- VENTAS -----------------

// Registrar venta y calcular puntos (permite usar puntos)
// puntosUsados: cantidad de puntos que el cliente desea aplicar (1 punto = $1)
// Además: registra una "visita" en subcolección visitas una sola vez por día.
export const registrarVenta = async (clienteId, totalVenta, puntosUsados = 0) => {
  if (!clienteId) throw new Error("clienteId es requerido");

  const clienteRef = doc(db, clientesCollection, clienteId);
  const clienteSnap = await getDoc(clienteRef);

  if (!clienteSnap.exists()) throw new Error("Cliente no existe");

  const clienteData = clienteSnap.data();
  const puntosActuales = clienteData.puntos || 0;
  const sobranteActual = clienteData.sobrante || 0;

  const totalVentaNum = Number(totalVenta) || 0;
  if (totalVentaNum < 0) throw new Error("totalVenta inválido");

  // Validar puntos a usar:
  //  - no más que los puntos que tiene el cliente
  //  - no más que el total de la venta (no dejamos puntosUsados > totalVenta)
  const puntosAUsarValidados = Math.max(0, Math.floor(puntosUsados || 0));
  const puntosUsadosFinal = Math.min(
    puntosAUsarValidados,
    puntosActuales,
    Math.floor(totalVentaNum)
  );

  // Total que paga realmente el cliente después de aplicar puntos
  const totalPagado = Math.max(totalVentaNum - puntosUsadosFinal, 0);

  // Calcular puntos ganados: 1 punto por cada 20 pesos reales pagados
  const totalConSobrante = sobranteActual + totalPagado;
  const puntosGanados = Math.floor(totalConSobrante / 20);
  const sobranteNuevo = totalConSobrante % 20;

  const nuevosPuntosTotales = puntosActuales - puntosUsadosFinal + puntosGanados;

  // Actualizar puntos y sobrante del cliente
  await updateDoc(clienteRef, { puntos: nuevosPuntosTotales, sobrante: sobranteNuevo });

  // Agregar la venta a la subcolección "ventas"
  const ventasColRef = collection(clienteRef, "ventas");
  const ventaPayload = {
    total: totalVentaNum,
    totalPagado,
    puntosUsados: puntosUsadosFinal,
    puntosGanados,
    fecha: new Date().toISOString(),
  };
  await addDoc(ventasColRef, ventaPayload);

  // --- Registrar VISITA por día (solo 1 visita por cliente por día) ---
  const visitasColRef = collection(clienteRef, "visitas");
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const qVis = query(visitasColRef, where("date", "==", todayStr));
  const visitasSnap = await getDocs(qVis);
  let visitaRegistrada = false;
  if (visitasSnap.empty) {
    // crear doc de visita para el día
    await addDoc(visitasColRef, { date: todayStr, timestamp: new Date().toISOString() });
    // incrementar contador de visitas en el documento cliente y actualizar lastVisit
    await updateDoc(clienteRef, { visitas: increment(1), lastVisit: new Date().toISOString() });
    visitaRegistrada = true;
  }

  return {
    puntosGanados,
    puntosUsados: puntosUsadosFinal,
    nuevosPuntosTotales,
    sobranteNuevo,
    totalPagado,
    visitaRegistrada,
  };
};

// Obtener historial de ventas de un cliente (ordenado por fecha descendente)
export const getVentasCliente = async (clienteId) => {
  if (!clienteId) return [];
  const clienteRef = doc(db, clientesCollection, clienteId);
  const ventasColRef = collection(clienteRef, "ventas");
  const q = query(ventasColRef, orderBy("fecha", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};
