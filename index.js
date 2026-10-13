
"use strict";

// Obtener los elementos de la página.
const campoExpresion = document.getElementById("expresion");
const btnCalcular = document.getElementById("btnCalcular");
const btnLimpiar = document.getElementById("btnLimpiar");
const mensaje = document.getElementById("mensaje");

const resultadoFinal = document.getElementById("resultadoFinal");
const expresionProcesada = document.getElementById("expresionProcesada");
const valorResultado = document.getElementById("valorResultado");
const procedimiento = document.getElementById("procedimiento");

const tablaTriplos = document.getElementById("tablaTriplos");
const tablaCuadruplos = document.getElementById("tablaCuadruplos");

// Caracteres permitidos: letras, números y operadores matemáticos.
const caracteresPermitidos = /^[A-Za-z0-9+\-*/^()=\s]+$/;

// Eventos de los botones.
btnCalcular.addEventListener("click", calcular);
btnLimpiar.addEventListener("click", limpiar);

campoExpresion.addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
        calcular();
    }
});

// Mostrar mensajes de error o éxito.
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
}

// Limpiar las tablas y ocultar resultados anteriores.
function ocultarResultados() {
    resultadoFinal.hidden = true;
    procedimiento.hidden = true;

    tablaTriplos.replaceChildren();
    tablaCuadruplos.replaceChildren();
}

// Función del botón Limpiar.
function limpiar() {
    campoExpresion.value = "";
    mensaje.textContent = "";
    mensaje.className = "mensaje";

    ocultarResultados();
    campoExpresion.focus();
}

// Función principal.
function calcular() {
    ocultarResultados();

    mensaje.textContent = "";
    mensaje.className = "mensaje";

    const original = campoExpresion.value.trim();

    if (original === "") {
        mostrarMensaje(
            "Escribe una expresión matemática.",
            "error"
        );
        return;
    }

    // Rechazar comas y caracteres que no estén permitidos.
    if (!caracteresPermitidos.test(original)) {
        mostrarMensaje(
            "Expresión inválida. Solo se permiten letras, números, operadores matemáticos, paréntesis e igual.",
            "error"
        );
        return;
    }

    try {
        const asignacion = separarAsignacion(original);
        const tokens = tokenizar(asignacion.expresion);

        validarSecuencia(tokens);

        // Obtener las letras diferentes utilizadas en la expresión.
        const variables = [
            ...new Set(tokens.filter(token => /^[A-Z]$/.test(token)))
        ];

        const valores = {};

        // Pedir el valor de cada variable.
        for (const variable of variables) {
            const entrada = prompt(
                `Ingresa el valor numérico de la variable ${variable}:`
            );

            if (entrada === null) {
                mostrarMensaje("Operación cancelada.", "error");
                return;
            }

            const texto = entrada.trim();

            // Aceptar enteros y decimales con punto.
            if (
                texto === "" ||
                !/^-?(?:\d+\.?\d*|\.\d+)$/.test(texto) ||
                !Number.isFinite(Number(texto))
            ) {
                throw new Error(
                    `El valor de ${variable} debe ser un número válido. Usa punto para los decimales.`
                );
            }

            valores[variable] = Number(texto);
        }

        // Estructuras que almacenan los triplos y cuádruplos.
        const generador = {
            triplos: [],
            cuadruplos: [],
            contador: 1
        };

        const analizador = crearAnalizador(
            tokens,
            valores,
            generador
        );

        const calculo = analizador.parsear();
        const resultado = calculo.valor;

        let textoExpresion = asignacion.expresion;

        // Registrar la asignación final, si se escribió una variable destino.
        if (asignacion.destino) {
            generador.triplos.push({
                indice: generador.triplos.length,
                operador: ":=",
                arg1: calculo.referencia,
                arg2: asignacion.destino
            });

            generador.cuadruplos.push({
                operador: ":=",
                arg1: calculo.referencia,
                arg2: "-",
                resultado: asignacion.destino
            });

            textoExpresion =
                `${asignacion.destino} = ${asignacion.expresion}`;
        }

        if (!Number.isFinite(resultado)) {
            throw new Error("El resultado no es un número válido.");
        }

        mostrarResultado(textoExpresion, resultado, generador);

        mostrarMensaje(
            "Expresión procesada correctamente.",
            "correcto"
        );

    } catch (error) {
        mostrarMensaje(
            error.message || "No fue posible procesar la expresión.",
            "error"
        );
    }
}

// Separar una asignación como R=(A+B)*2.
function separarAsignacion(texto) {
    const partes = texto.split("=");

    if (partes.length === 1) {
        return {
            destino: null,
            expresion: texto
        };
    }

    if (partes.length !== 2) {
        throw new Error("Solo se permite un signo igual (=).");
    }

    const destino = partes[0].trim().toUpperCase();
    const expresion = partes[1].trim();

    if (!/^[A-Z]$/.test(destino)) {
        throw new Error(
            "A la izquierda de = escribe una sola letra."
        );
    }

    if (expresion === "") {
        throw new Error(
            "Escribe una expresión después del signo igual."
        );
    }

    return { destino, expresion };
}

// Separar la expresión en números, letras y operadores.
function tokenizar(texto) {
    const tokens = [];
    let i = 0;

    while (i < texto.length) {
        const caracter = texto[i];

        if (/\s/.test(caracter)) {
            i++;
            continue;
        }

        // Leer números enteros o decimales.
        if (/[0-9.]/.test(caracter)) {
            const coincidencia = texto
                .slice(i)
                .match(/^(?:\d+\.?\d*|\.\d+)/);

            if (!coincidencia) {
                throw new Error(
                    `Número inválido cerca de "${texto.slice(i)}".`
                );
            }

            tokens.push(coincidencia[0]);
            i += coincidencia[0].length;
            continue;
        }

        // Aceptar cualquier letra y convertirla a mayúscula.
        if (/[A-Za-z]/.test(caracter)) {
            tokens.push(caracter.toUpperCase());
            i++;
            continue;
        }

        if ("+-*/^()".includes(caracter)) {
            tokens.push(caracter);
            i++;
            continue;
        }

        throw new Error(`Carácter no permitido: ${caracter}`);
    }

    if (tokens.length === 0) {
        throw new Error("La expresión está vacía.");
    }

    return tokens;
}

// Validar el orden de operandos, operadores y paréntesis.
function validarSecuencia(tokens) {
    let balance = 0;
    let esperaOperando = true;

    for (const token of tokens) {
        const esNumero =
            /^(?:\d+\.?\d*|\.\d+)$/.test(token);

        const esVariable = /^[A-Z]$/.test(token);

        if (esNumero || esVariable) {
            if (!esperaOperando) {
                throw new Error(
                    `Falta un operador antes de "${token}".`
                );
            }

            esperaOperando = false;

        } else if (token === "(") {
            if (!esperaOperando) {
                throw new Error(
                    "Falta un operador antes del paréntesis."
                );
            }

            balance++;
            esperaOperando = true;

        } else if (token === ")") {
            if (balance <= 0) {
                throw new Error(
                    "Hay un paréntesis de cierre sin apertura."
                );
            }

            if (esperaOperando) {
                throw new Error(
                    "Hay un paréntesis vacío o falta un operando."
                );
            }

            balance--;
            esperaOperando = false;

        } else if (["+", "-", "*", "/", "^"].includes(token)) {
            // Permitir signos unarios como -A o 5*(-2).
            if (esperaOperando) {
                if (token === "+" || token === "-") {
                    continue;
                }

                throw new Error(
                    `El operador "${token}" necesita un operando a la izquierda.`
                );
            }

            esperaOperando = true;
        }
    }

    if (balance !== 0) {
        throw new Error("Los paréntesis no están equilibrados.");
    }

    if (esperaOperando) {
        throw new Error(
            "La expresión termina con un operador o está incompleta."
        );
    }
}

// Analizador matemático que respeta la prioridad de las operaciones.
function crearAnalizador(tokens, valores, generador) {
    let posicion = 0;

    function actual() {
        return tokens[posicion];
    }

    function consumir() {
        return tokens[posicion++];
    }

    // Guardar cada operación en las tablas.
    function crearOperacion(operador, izquierda, derecha, valor) {
        const indice = generador.triplos.length;
        const temporal = `T${generador.contador++}`;

        generador.triplos.push({
            indice,
            operador,
            arg1: izquierda.referencia,
            arg2: derecha.referencia
        });

        generador.cuadruplos.push({
            operador,
            arg1: izquierda.referencia,
            arg2: derecha.referencia,
            resultado: temporal
        });

        return {
            valor,
            referencia: `(${indice})`
        };
    }

    // Números, variables, paréntesis y signos unarios.
    function primaria() {
        const token = actual();

        if (token === "+" || token === "-") {
            consumir();

            const valor = primaria();

            if (token === "+") {
                return valor;
            }

            return crearOperacion(
                "-",
                { valor: 0, referencia: "0" },
                valor,
                -valor.valor
            );
        }

        if (token === "(") {
            consumir();

            const resultado = sumaResta();

            if (actual() !== ")") {
                throw new Error("Falta un paréntesis de cierre.");
            }

            consumir();
            return resultado;
        }

        if (token === undefined) {
            throw new Error("Falta un operando.");
        }

        if (/^(?:\d+\.?\d*|\.\d+)$/.test(token)) {
            consumir();

            return {
                valor: Number(token),
                referencia: token
            };
        }

        if (/^[A-Z]$/.test(token)) {
            consumir();

            if (!(token in valores)) {
                throw new Error(`No se definió el valor de ${token}.`);
            }

            return {
                valor: valores[token],
                referencia: token
            };
        }

        throw new Error(`Operando inesperado: "${token}".`);
    }

    // Potencias.
    function potencia() {
        let izquierda = primaria();

        if (actual() === "^") {
            consumir();

            const derecha = potencia();

            izquierda = crearOperacion(
                "^",
                izquierda,
                derecha,
                Math.pow(izquierda.valor, derecha.valor)
            );
        }

        return izquierda;
    }

    // Multiplicación y división.
    function multiplicacionDivision() {
        let izquierda = potencia();

        while (actual() === "*" || actual() === "/") {
            const operador = consumir();
            const derecha = potencia();

            if (operador === "/" && derecha.valor === 0) {
                throw new Error("No se puede dividir entre cero.");
            }

            const resultado = operador === "*"
                ? izquierda.valor * derecha.valor
                : izquierda.valor / derecha.valor;

            izquierda = crearOperacion(
                operador,
                izquierda,
                derecha,
                resultado
            );
        }

        return izquierda;
    }

    // Suma y resta.
    function sumaResta() {
        let izquierda = multiplicacionDivision();

        while (actual() === "+" || actual() === "-") {
            const operador = consumir();
            const derecha = multiplicacionDivision();

            const resultado = operador === "+"
                ? izquierda.valor + derecha.valor
                : izquierda.valor - derecha.valor;

            izquierda = crearOperacion(
                operador,
                izquierda,
                derecha,
                resultado
            );
        }

        return izquierda;
    }

    return {
        parsear() {
            const resultado = sumaResta();

            if (posicion < tokens.length) {
                throw new Error(
                    `No se esperaba el elemento "${actual()}".`
                );
            }

            return resultado;
        }
    };
}

// Mostrar el resultado y construir las tablas.
function mostrarResultado(expresion, resultado, generador) {
    expresionProcesada.textContent = `Expresión: ${expresion}`;

    valorResultado.textContent =
        `Resultado numérico: ${Number(resultado.toFixed(10))}`;

    resultadoFinal.hidden = false;
    procedimiento.hidden = false;

    for (const fila of generador.triplos) {
        const tr = document.createElement("tr");

        [
            fila.indice,
            fila.operador,
            fila.arg1,
            fila.arg2
        ].forEach(valor => agregarCelda(tr, valor));

        tablaTriplos.appendChild(tr);
    }

    for (const fila of generador.cuadruplos) {
        const tr = document.createElement("tr");

        [
            fila.operador,
            fila.arg1,
            fila.arg2,
            fila.resultado
        ].forEach(valor => agregarCelda(tr, valor));

        tablaCuadruplos.appendChild(tr);
    }

    if (generador.triplos.length === 0) {
        agregarFilaVacia(tablaTriplos);
        agregarFilaVacia(tablaCuadruplos);
    }
}

// Crear celdas usando textContent para mostrar el contenido como texto.
function agregarCelda(fila, contenido) {
    const celda = document.createElement("td");
    celda.textContent = String(contenido);
    fila.appendChild(celda);
}

function agregarFilaVacia(tabla) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = 4;
    celda.textContent = "No se necesitan operaciones intermedias.";

    fila.appendChild(celda);
    tabla.appendChild(fila);
}
