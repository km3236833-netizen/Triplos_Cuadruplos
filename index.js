
"use strict";


const campoExpresion = document.getElementById("expresion");
const botonCalcular = document.getElementById("btnCalcular");
const botonLimpiar = document.getElementById("btnLimpiar");

const tablaTriplos = document.getElementById("tablaTriplos");
const tablaCuadruplos = document.getElementById("tablaCuadruplos");

const mensaje = document.getElementById("mensaje");
const resultadoFinal = document.getElementById("resultadoFinal");
const procedimiento = document.getElementById("procedimiento");

// Arreglos donde se almacenan las operaciones
let triplos = [];
let cuadruplos = [];
let pasos = [];


function tokenizar(expresion) {
    const tokens = [];
    let posicion = 0;

    while (posicion < expresion.length) {
        const resto = expresion.slice(posicion);

        // Ignorar espacios
        const espacios = resto.match(/^\s+/);

        if (espacios) {
            posicion += espacios[0].length;
            continue;
        }

        // Reconocer números enteros y decimales
        const numero = resto.match(/^\d+(?:\.\d+)?/);

        if (numero) {
            tokens.push({
                tipo: "numero",
                valor: numero[0]
            });

            posicion += numero[0].length;
            continue;
        }

        // Reconocer nombres de variables
        const variable = resto.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);

        if (variable) {
            tokens.push({
                tipo: "variable",
                valor: variable[0]
            });

            posicion += variable[0].length;
            continue;
        }

        // Reconocer operadores y paréntesis
        const caracter = expresion[posicion];

        if ("+-*/^()=".includes(caracter)) {
            tokens.push({
                tipo: "simbolo",
                valor: caracter
            });

            posicion++;
            continue;
        }

        throw new Error(
            `Carácter no permitido: "${caracter}".`
        );
    }

    return tokens;
}

function agregarOperacion(operador, arg1, arg2 = "-") {
    const indice = triplos.length;
    const temporal = `T${cuadruplos.length + 1}`;

    // Guardar la operación en la tabla de triplos
    triplos.push({
        indice: indice,
        operador: operador,
        arg1: arg1,
        arg2: arg2
    });

    // Convertir una referencia de triplo en temporal
    function convertirReferencia(valor) {
        const referencia = /^\((\d+)\)$/.exec(String(valor));

        if (referencia) {
            return `T${Number(referencia[1]) + 1}`;
        }

        return valor;
    }

    // Guardar la operación en la tabla de cuádruplos
    cuadruplos.push({
        operador: operador,
        arg1: convertirReferencia(arg1),
        arg2: convertirReferencia(arg2),
        resultado: temporal
    });

    return `(${indice})`;
}

function analizar(tokens) {
    let posicion = 0;

    // Revisar si hay una asignación, por ejemplo R = 5 + 2
    let destino = null;

    if (
        tokens.length >= 2 &&
        tokens[0].tipo === "variable" &&
        tokens[1].valor === "="
    ) {
        destino = tokens[0].valor;
        posicion = 2;
    }

    if (posicion >= tokens.length) {
        throw new Error("Escribe una expresión matemática.");
    }

    // Obtener el símbolo actual
    function actual() {
        return tokens[posicion];
    }

    // Aceptar un número o una expresión entre paréntesis
    function primaria() {
        const token = actual();

        if (!token) {
            throw new Error("La expresión está incompleta.");
        }

        // Leer números
        if (token.tipo === "numero") {
            posicion++;

            return {
                referencia: token.valor,
                valor: Number(token.valor)
            };
        }

        // Leer expresiones entre paréntesis
        if (token.valor === "(") {
            posicion++;

            const resultado = expresion();

            if (!actual() || actual().valor !== ")") {
                throw new Error("Falta cerrar un paréntesis.");
            }

            posicion++;

            return resultado;
        }

        // Las variables requieren valores para calcularse
        if (token.tipo === "variable") {
            throw new Error(
                `La variable "${token.valor}" no tiene un valor numérico. Usa números para calcular.`
            );
        }

        throw new Error(
            `Se esperaba un número o un paréntesis, no "${token.valor}".`
        );
    }

    // Resolver potencias
    function potencia() {
        const izquierdo = primaria();

        if (actual() && actual().valor === "^") {
            posicion++;

            // La potencia se evalúa de derecha a izquierda
            const derecho = unaria();

            return operar("^", izquierdo, derecho);
        }

        return izquierdo;
    }

    // Resolver signos positivos y negativos
    function unaria() {
        if (actual() && actual().valor === "+") {
            posicion++;
            return unaria();
        }

        if (actual() && actual().valor === "-") {
            posicion++;

            const valor = unaria();

            return operar("uminus", valor);
        }

        return potencia();
    }

    // Resolver multiplicaciones y divisiones
    function multiplicativa() {
        let izquierdo = unaria();

        while (
            actual() &&
            (actual().valor === "*" || actual().valor === "/")
        ) {
            const operador = actual().valor;
            posicion++;

            const derecho = unaria();

            izquierdo = operar(operador, izquierdo, derecho);
        }

        return izquierdo;
    }

    // Resolver sumas y restas
    function expresion() {
        let izquierdo = multiplicativa();

        while (
            actual() &&
            (actual().valor === "+" || actual().valor === "-")
        ) {
            const operador = actual().valor;
            posicion++;

            const derecho = multiplicativa();

            izquierdo = operar(operador, izquierdo, derecho);
        }

        return izquierdo;
    }

    // Realizar el cálculo y guardar su representación intermedia
    function operar(operador, izquierdo, derecho = null) {
        const valor1 = izquierdo.valor;
        const valor2 = derecho ? derecho.valor : null;

        let valorCalculado;

        switch (operador) {
            case "+":
                valorCalculado = valor1 + valor2;
                break;

            case "-":
                valorCalculado = valor1 - valor2;
                break;

            case "*":
                valorCalculado = valor1 * valor2;
                break;

            case "/":
                if (valor2 === 0) {
                    throw new Error("No se puede dividir entre cero.");
                }

                valorCalculado = valor1 / valor2;
                break;

            case "^":
                valorCalculado = valor1 ** valor2;
                break;

            case "uminus":
                valorCalculado = -valor1;
                break;

            default:
                throw new Error("Operador no reconocido.");
        }

        if (!Number.isFinite(valorCalculado)) {
            throw new Error(
                "El resultado no es un número finito válido."
            );
        }

        // Guardar la operación como triplo y cuádruplo
        const referencia = agregarOperacion(
            operador,
            izquierdo.referencia,
            derecho ? derecho.referencia : "-"
        );

        // Guardar el paso del procedimiento
        const simbolo = operador === "uminus" ? "-" : operador;

        const textoPaso = derecho
            ? `${valor1} ${simbolo} ${valor2} = ${valorCalculado}`
            : `-(${valor1}) = ${valorCalculado}`;

        pasos.push(textoPaso);

        return {
            referencia: referencia,
            valor: valorCalculado
        };
    }

    // Comenzar el análisis
    const resultado = expresion();

    // Comprobar que no sobren símbolos
    if (posicion !== tokens.length) {
        throw new Error(
            `Símbolo inesperado: "${tokens[posicion].valor}".`
        );
    }

    // Registrar la asignación final si existe
    if (destino !== null) {
        triplos.push({
            indice: triplos.length,
            operador: ":=",
            arg1: resultado.referencia,
            arg2: destino
        });

        cuadruplos.push({
            operador: ":=",
            arg1: convertirResultado(resultado.referencia),
            arg2: "-",
            resultado: destino
        });

        pasos.push(`${destino} = ${resultado.valor}`);
    }

    return resultado.valor;
}

// Convertir una referencia de triplo a temporal
function convertirResultado(referencia) {
    const coincidencia = /^\((\d+)\)$/.exec(String(referencia));

    if (coincidencia) {
        return `T${Number(coincidencia[1]) + 1}`;
    }

    return referencia;
}


function mostrarTriplos() {
    tablaTriplos.replaceChildren();

    triplos.forEach((triplo) => {
        const fila = document.createElement("tr");

        [
            triplo.indice,
            triplo.operador,
            triplo.arg1,
            triplo.arg2
        ].forEach((valor) => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });

        tablaTriplos.appendChild(fila);
    });
}

function mostrarCuadruplos() {
    tablaCuadruplos.replaceChildren();

    cuadruplos.forEach((cuadruplo) => {
        const fila = document.createElement("tr");

        [
            cuadruplo.operador,
            cuadruplo.arg1,
            cuadruplo.arg2,
            cuadruplo.resultado
        ].forEach((valor) => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });

        tablaCuadruplos.appendChild(fila);
    });
}

function mostrarProcedimiento() {
    procedimiento.replaceChildren();

    pasos.forEach((paso, indice) => {
        const linea = document.createElement("p");

        linea.textContent = `${indice + 1}. ${paso}`;

        procedimiento.appendChild(linea);
    });
}


function calcular() {
    try {
        // Limpiar los resultados anteriores
        reiniciarResultados();

        const texto = campoExpresion.value.trim();

        if (texto === "") {
            throw new Error("Primero escribe una expresión.");
        }

        // Convertir el texto en tokens
        const tokens = tokenizar(texto);

        if (tokens.length === 0) {
            throw new Error("No se encontró una expresión.");
        }

        // Analizar, generar operaciones y calcular
        const resultado = analizar(tokens);

        // Mostrar las tablas y el procedimiento
        mostrarTriplos();
        mostrarCuadruplos();
        mostrarProcedimiento();

        resultadoFinal.textContent =
            Number(resultado.toPrecision(12)).toString();

        mensaje.textContent = "Cálculo realizado correctamente.";
        mensaje.style.color = "#15803d";

    } catch (error) {
        // No conservar resultados parciales si ocurre un error
        reiniciarResultados();

        mensaje.textContent = "Error: " + error.message;
        mensaje.style.color = "#dc2626";
    }
}


function reiniciarResultados() {
    triplos = [];
    cuadruplos = [];
    pasos = [];

    tablaTriplos.replaceChildren();
    tablaCuadruplos.replaceChildren();
    procedimiento.replaceChildren();

    resultadoFinal.textContent = "Pendiente de calcular";

    const filaTriplo = document.createElement("tr");
    const celdaTriplo = document.createElement("td");

    celdaTriplo.colSpan = 4;
    celdaTriplo.className = "vacio";
    celdaTriplo.textContent = "Sin resultados.";

    filaTriplo.appendChild(celdaTriplo);
    tablaTriplos.appendChild(filaTriplo);

    const filaCuadruplo = document.createElement("tr");
    const celdaCuadruplo = document.createElement("td");

    celdaCuadruplo.colSpan = 4;
    celdaCuadruplo.className = "vacio";
    celdaCuadruplo.textContent = "Sin resultados.";

    filaCuadruplo.appendChild(celdaCuadruplo);
    tablaCuadruplos.appendChild(filaCuadruplo);
}


function limpiar() {
    campoExpresion.value = "";
    reiniciarResultados();

    mensaje.textContent = "";

    campoExpresion.focus();
}

// Conectar los botones con sus funciones
botonCalcular.addEventListener("click", calcular);
botonLimpiar.addEventListener("click", limpiar);

// Calcular también al presionar Enter
campoExpresion.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        calcular();
    }
});
