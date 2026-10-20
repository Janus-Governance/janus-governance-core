<!-- TITLE-001 -->
# Janus: un núcleo mínimo de gobernanza para sistemas de desarrollo humano–IA con reconstrucción determinista

## Traducción al español latinoamericano (es-419)

**Versión:** v1.0.2-es-419  
**Estado:** Traducción publicada  
**Autor:** Lic. Martín Nicolás Sánchez Morales  
**Proyecto:** Janus Governance Project, Argentina  
**Original inglés canónico:** https://doi.org/10.5281/zenodo.23460644

> **Nota editorial de traducción.** Esta traducción reproduce fielmente el cuerpo histórico del Foundational Paper y consolida únicamente las correcciones publicadas en su errata. La adenda se mantiene completa y exclusivamente como sección separada, explícitamente identificada; ninguna de sus aclaraciones se incorpora al cuerpo histórico. El original inglés y sus registros publicados permanecen inalterados. Esta traducción no sustituye al original. La traducción fue autorizada por el autor, aprobada para publicación y preparada con asistencia técnica.

<!-- ABS-001 -->
## Resumen

La rápida adopción de herramientas de desarrollo asistidas por inteligencia artificial ha transformado de manera significativa los flujos de trabajo de la ingeniería de software. Sin embargo, los marcos actuales de gobernanza tecnológica operan principalmente en los niveles organizacional o regulatorio —con foco en el cumplimiento, la ética y la gestión de riesgos—, mientras dejan en gran medida indefinida la gobernanza cotidiana de las interacciones entre desarrolladores humanos y sistemas generativos de código.

<!-- ABS-002 -->
Este artículo presenta **Janus**, un núcleo mínimo de gobernanza para entornos de desarrollo asistidos por IA. Janus define un conjunto reducido de invariantes fundacionales de gobernanza que permiten que los flujos de trabajo híbridos humano–IA sean **trazables, auditables y reconstruibles de forma determinista**.

<!-- ABS-003 -->
El modelo se basa en tres elementos fundacionales: registros de solo anexado (*append-only logs*) que preservan la historia institucional del sistema; un modelo dual explícito de evidencia (`E+` / `E−`) capaz de representar tanto acciones registradas como omisiones verificables; y una frontera formal de autoridad humana que mantiene la rendición de cuentas sobre las decisiones que requieren responsabilidad.

<!-- ABS-004 -->
A diferencia de metodologías de desarrollo como Agile, DevOps o ITIL, Janus no redefine los procesos organizacionales. En cambio, introduce **invariantes operacionales mínimos** que estabilizan la interacción entre seres humanos y sistemas generativos sin aumentar de manera significativa la complejidad del sistema.

<!-- ABS-005 -->
El resultado es una intervención microestructural que puede integrarse con distintas pilas tecnológicas y reducir la deriva silenciosa, la ambigüedad de autoridad y la pérdida de trazabilidad en sistemas de desarrollo de software asistidos por IA.

**Palabras clave:** gobernanza de IA, sistemas humano–IA, gobernanza de software, reconstrucción determinista, sistemas sociotécnicos, gobernanza del desarrollo.

<!-- SEC-01-P001 -->
## I. Introducción

Las herramientas modernas de generación de código basadas en IA —incluidos los asistentes conversacionales integrados en entornos de desarrollo, los copilotos automatizados y las plataformas de automatización low-code— han introducido un nuevo paradigma de producción en la ingeniería de software.

<!-- SEC-01-P002 -->
Este paradigma se caracteriza por:

- generación externa de artefactos técnicos;
- ciclos de iteración acelerados;
- menor fricción sintáctica;
- dependencia parcial del razonamiento automatizado.

<!-- SEC-01-P003 -->
Sin embargo, esta transformación introduce un problema estructural que continúa en gran medida inexplorado:

**¿Cómo se gobierna la interacción humano–IA en el nivel microoperacional del desarrollo de software?**

<!-- SEC-01-P004 -->
Las metodologías tradicionales regulan procesos organizacionales, pipelines de despliegue y coordinación de flujos de trabajo, pero no formalizan explícitamente la relación entre la generación automatizada de código y la validación humana.

<!-- SEC-01-P005 -->
Esta brecha introduce riesgos estructurales como:

- autoridad difusa;
- deriva de versiones no detectada;
- validación basada en plausibilidad;
- ausencia de evidencia estructural verificable.

<!-- SEC-01-P006 -->
Janus surge como respuesta a esta brecha de gobernanza.

<!-- SEC-01-P007 -->
### A. Contribuciones

Este artículo realiza tres contribuciones principales:

1. propone un **núcleo mínimo de gobernanza** para entornos de desarrollo asistidos por IA;
2. introduce un **modelo dual de evidencia (`E+` / `E−`)** capaz de representar tanto acciones registradas como omisiones estructuralmente detectables;
3. define un **modelo de reconstrucción determinista** que permite reconstruir estados de gobernanza a partir de eventos gobernados.

Estas contribuciones buscan formalizar la gobernanza microoperacional en sistemas híbridos humano–IA sin introducir complejidad organizacional adicional.

<!-- SEC-01-P008 -->
### B. Hipótesis de investigación

Este trabajo se apoya en la siguiente hipótesis:

**En los sistemas de desarrollo asistidos por IA, la ausencia de evidencia estructural verificable genera deriva operacional, incoherencia y ambigüedad de responsabilidad. Introducir un conjunto mínimo de invariantes de gobernanza —basado en registros de solo anexado, modelos explícitos de evidencia (`E+` / `E−`) y decisiones humanas auditables— transforma los flujos de trabajo basados en plausibilidad en sistemas reconstruibles de forma determinista.**

<!-- SEC-01-P009 -->
En otras palabras, la distinción crítica no se da únicamente entre automatización y supervisión humana, sino entre **creer que algo ocurrió dentro de un sistema y poder demostrar, mediante evidencia estructural, qué ocurrió realmente**.

<!-- SEC-01-P010 -->
Janus propone una intervención microestructural destinada a reducir esta brecha epistémica dentro de sistemas híbridos humano–IA. La premisa subyacente es que **pequeñas intervenciones estructurales pueden producir mejoras desproporcionadas en la estabilidad de sistemas complejos**, en particular cuando actores humanos y máquinas comparten responsabilidad operacional.

<!-- SEC-02-P001 -->
## II. Antecedentes teóricos

### A. Sistemas sociotécnicos

La teoría de sistemas sociotécnicos sostiene que la introducción de nuevas tecnologías altera la organización del trabajo y exige redefinir las estructuras de coordinación y autoridad [1].

<!-- SEC-02-P002 -->
En entornos de desarrollo asistidos por IA, la herramienta no reemplaza al desarrollador; introduce, en cambio, un agente generativo intermedio cuyo rol y autoridad deben definirse estructuralmente. Cuando los sistemas generativos participan de manera directa en la producción técnica, los mecanismos de gobernanza deben definir explícitamente cómo se ejercen la autoridad, la validación y la responsabilidad a través de la frontera humano–IA.

<!-- SEC-02-P003 -->
En este contexto, el modelo de reconstrucción determinista propuesto por Janus también permite preservar la **memoria institucional** en sistemas sociotécnicos híbridos. Como los eventos de gobernanza, los registros de evidencia y las decisiones de autoridad humana se almacenan en estructuras de solo anexado, la historia operacional del sistema puede reconstruirse a lo largo del tiempo sin depender de recuerdos informales ni documentación fragmentaria. En este sentido, los registros de gobernanza funcionan no solo como artefactos de auditoría, sino también como un registro duradero del conocimiento institucional y de la historia de decisiones.

<!-- SEC-02-P004 -->
### B. Gobernanza y responsabilidad

La gobernanza implica definir explícitamente reglas, responsabilidades y mecanismos de validación dentro de sistemas complejos [2]. En la literatura de ingeniería de software, la gobernanza también ha sido examinada en el nivel arquitectónico, donde la gobernanza arquitectónica define cómo se supervisan y validan la evolución del sistema y las decisiones de diseño en una organización. La referencia bibliográfica originalmente citada para esta última afirmación fue retirada por la errata publicada porque no se encontró una fuente local verificable.

<!-- SEC-02-P005 -->
En entornos híbridos humano–IA, la ausencia de reglas operacionales claras puede conducir a depender de confianza informal o autoridad implícita.

<!-- SEC-02-P006 -->
Janus no propone un marco ético general, sino un modelo operacional de gobernanza técnica.

<!-- SEC-02-P007 -->
### C. Arquitectura independiente de la infraestructura

Los principios de arquitectura limpia proponen separar las reglas del sistema de las tecnologías de implementación [3].

<!-- SEC-02-P008 -->
Janus adopta este enfoque mediante la separación de tres componentes:

- núcleo normativo;
- runtime ejecutable;
- protocolos de interacción.

Esta arquitectura permite que las reglas de gobernanza permanezcan independientes de cualquier tecnología específica.

<!-- SEC-03-P001 -->
## III. Brecha de gobernanza en el desarrollo asistido por IA

En los flujos de trabajo de desarrollo asistidos por IA es común observar el siguiente ciclo:

1. solicitar código a un sistema de IA;
2. insertar el código generado en el entorno de desarrollo;
3. iterar mediante prueba y error;
4. declarar éxito a partir de la funcionalidad observable.

<!-- SEC-03-P002 -->
Este modelo puede producir:

- deriva estructural silenciosa;
- fragmentación de versiones;
- pérdida de trazabilidad;
- validación implícita no documentada.

<!-- SEC-03-P003 -->
La inteligencia artificial no crea por sí sola estos problemas; más bien, amplifica debilidades estructurales preexistentes.

<!-- SEC-04-P001 -->
## IV. Janus: gobernanza microoperacional

Janus propone una capa mínima de gobernanza basada en los siguientes principios:

- autoridad explícita;
- congelamiento de baseline;
- gates de validación;
- telemetría estructurada;
- validación de identidad estructural;
- reconstrucción determinista.

<!-- SEC-04-P002 -->
Janus no impone una metodología organizacional. En cambio, define **invariantes estructurales mínimos**.

<!-- SEC-04-P003 -->
### A. Núcleo de gobernanza

Janus puede entenderse como un **núcleo mínimo de gobernanza** para sistemas híbridos humano–IA. Este núcleo define únicamente los invariantes fundacionales de gobernanza necesarios para mantener trazabilidad, auditabilidad y responsabilidad explícita.

<!-- SEC-04-P004 -->
#### 1. Registros de solo anexado

Tres registros canónicos almacenan la historia institucional del sistema:

- `MANAGEMENT_LOG`;
- `SCHEMA_LOG`;
- `AUDIT_LOG`.

<!-- SEC-04-P005 -->
#### 2. Modelo de evidencia

El sistema distingue dos tipos de evidencia:

- **`E+`** — evidencia registrada explícitamente;
- **`E−`** — evidencia derivada de la ausencia verificable de un registro esperado.

<!-- SEC-04-P006 -->
#### 3. Evaluación de gobernanza

Los procesos de evaluación interpretan evidencia dentro de un alcance definido para determinar si deben generarse eventos de gobernanza.

<!-- SEC-04-P007 -->
#### 4. Eventos de gobernanza

Janus define dos eventos canónicos:

- `OMISSION_DETECTED`;
- `HUMAN_DECISION`.

<!-- SEC-04-P008 -->
#### 5. Frontera de autoridad

Los eventos de gobernanza solo pueden escribirse mediante un mecanismo autorizado denominado **Audit Writer**.

<!-- SEC-04-P009 -->
#### 6. Reconstrucción determinista

El estado de gobernanza puede reconstruirse a partir de:

- registros históricos;
- contexto de esquema;
- referencias de evidencia.

<!-- SEC-05-P001 -->
## V. Modelo de evidencia (`E+` / `E−`)

Una contribución central de Janus es la introducción de un modelo dual de evidencia.

<!-- ERR-01 --><!-- SEC-05-P002 -->
### A. Evidencia positiva (`E+`)

Evidencia registrada explícitamente en un sistema de registro; indica que una afirmación o un evento está respaldado por un artefacto registrado.

<!-- ERR-02 --><!-- SEC-05-P003 -->
### B. Evidencia negativa (`E−`)

Evidencia derivada de la ausencia verificada de un registro esperado, con relación a una expectativa definida, un alcance determinista de búsqueda, el contexto aplicable de `SCHEMA_LOG` y una observación reproducible.

<!-- SEC-05-P004 -->
Este modelo permite representar no solo eventos que ocurrieron, sino también **ausencias estructuralmente relevantes**.

<!-- FIG-01-CAPTION -->
**Figura 1. Pipeline del núcleo de gobernanza Janus.** La actividad de dominio genera evidencia (`E+` / `E−`), que es interpretada por flujos de evaluación de gobernanza. Cuando se requiere rendición de cuentas, la autoridad humana explícita produce un evento `HUMAN_DECISION`. Los resultados de gobernanza se registran mediante el Audit Writer autorizado en `AUDIT_LOG`, lo que permite la reconstrucción determinista del estado de gobernanza.

<!-- SEC-05-P005 -->
### C. Formalización conceptual

\[
\mathrm{GovernanceState} = f(\mathrm{Event},\, \mathrm{Evidence},\, \mathrm{HumanDecision})
\]

donde **Event** representa eventos de dominio que ocurren en el sistema; **Evidence** representa evidencia generada bajo el modelo `E+` / `E−`; y **HumanDecision** representa decisiones explícitas de autoridad humana.

<!-- SEC-05-P006 -->
Una segunda relación representa la reconstrucción determinista:

\[
\mathrm{GovernanceState}_{t} = g(\mathrm{MANAGEMENT\_LOG}_{\le t},\, \mathrm{SCHEMA\_LOG}_{\le t},\, \mathrm{AUDIT\_LOG}_{\le t})
\]

Esta ecuación expresa que el estado de gobernanza en el tiempo **t** puede reconstruirse **de forma determinista** a partir de los registros canónicos del sistema.

<!-- SEC-05-P007 -->
La evidencia puede definirse como:

\[
\mathrm{Evidence} = E^{+} \cup E^{-}
\]

En conjunto, estas relaciones muestran que la gobernanza en Janus no depende de estados implícitos, sino de funciones reconstruibles derivadas de registros observables.

<!-- SEC-05-P008 -->
\[
\mathrm{SystemState} = h(\mathrm{GovernanceState})
\]

Esta relación expresa que, cuando los eventos de gobernanza describen por completo la actividad autorizada del sistema, el estado operacional del sistema se vuelve derivable del propio estado de gobernanza. En otras palabras, la reconstrucción determinista supone que los eventos de gobernanza capturan el conjunto de transiciones operacionales autorizadas dentro del sistema.

<!-- ERR-03 --><!-- FIG-02-CAPTION -->
**Secuencia conceptual prevista de la Figura 2:** `Domain Events -> Evidence (E+ / E-) -> Governance Evaluation -> HUMAN_DECISION (cuando se requiere rendición de cuentas) -> Audit Writer -> AUDIT_LOG -> GovernanceState -> SystemState`.

**Figura 2. Modelo de reconstrucción de sistemas sociotécnicos implicado por el núcleo de gobernanza Janus.** Los eventos de dominio generan evidencia (`E+` / `E−`), que se evalúa mediante procesos de gobernanza. Las decisiones de autoridad humana y el registro controlado por auditoría producen un estado de gobernanza a partir del cual el estado operacional del sistema se vuelve derivable. `HUMAN_DECISION` ocurre cuando se requiere rendición de cuentas. La transición final es una hipótesis condicional del artículo, no un invariante de Janus Core.

<!-- SEC-06-P001 -->
## VI. Validación empírica inicial

Una característica metodológica relevante del proyecto es que el desarrollo de Janus —incluidos el núcleo conceptual, los repositorios de código, el entorno de documentación y los runtimes experimentales— se realizó bajo los mismos protocolos de gobernanza propuestos por el sistema.

<!-- SEC-06-P002 -->
En este sentido, el proyecto funcionó como un caso inicial de **autogobernanza estructural (dogfooding)**, en el cual se aplicaron reglas de trazabilidad, registro de eventos y decisiones humanas durante la construcción del propio sistema.

<!-- SEC-06-P003 -->
Este enfoque permitió evaluar la coherencia interna del modelo en condiciones reales de desarrollo asistido por IA.

<!-- SEC-06-P004 -->
En términos metodológicos, **Janus fue desarrollado bajo sus propias restricciones de gobernanza**, lo que refuerza la alineación entre el modelo propuesto y su implementación experimental.

<!-- SEC-06-P005 -->
El modelo se probó mediante:

- la definición de un núcleo independiente del runtime;
- una implementación en un runtime de Apps Script;
- una implementación en un runtime de Node;
- pruebas de telemetría estructurada orientadas a verificar la reconstrucción determinista del estado de gobernanza desde registros de solo anexado y a detectar inconsistencias estructurales mediante el modelo de evidencia `E+` / `E−`.

<!-- SEC-06-P006 -->
Los resultados observados incluyen:

- estabilidad estructural;
- coherencia contractual;
- detección estructural de inconsistencias;
- reproducibilidad controlada.

<!-- SEC-07-P001 -->
## VII. Discusión

Aunque Janus se presenta principalmente como un **núcleo mínimo de gobernanza**, su diseño permite que capas superiores evolucionen hacia un **marco de gobernanza para entornos de desarrollo asistidos por IA** más amplio.

<!-- SEC-07-P002 -->
Este artículo no afirma la existencia de tal marco; describe los **invariantes fundacionales mínimos de gobernanza** que podrían sostener extensiones futuras. En consonancia con este objetivo, el núcleo de Janus está destinado a distribuirse como un **núcleo de gobernanza de código abierto**, para permitir que investigadores independientes y equipos de ingeniería reproduzcan experimentos, auditen el modelo de gobernanza e implementen runtimes alternativos preservando los invariantes canónicos definidos en este trabajo.

<!-- SEC-07-P003 -->
En este sentido, Janus puede entenderse como una infraestructura conceptual sobre la que podrían construirse políticas, herramientas y runtimes de gobernanza, preservando a la vez la simplicidad del núcleo propuesto.

<!-- SEC-07-P004 -->
Janus no compite con marcos de gobernanza organizacional ni intenta sustituir metodologías ágiles o modelos de gobernanza arquitectónica descritos en la literatura. Opera en otro nivel: la **capa microoperacional de interacción humano–IA**. En este nivel, la reconstrucción determinista también implica que los registros de gobernanza funcionan como memoria institucional persistente del sistema y preservan la historia trazable de decisiones, evidencia y autoridad.

<!-- SEC-07-P005 -->
### A. Comparación conceptual

Un aspecto central de Janus es cómo se diferencia de los modelos existentes.

La mayoría de los marcos utilizados en ingeniería de software operan en niveles diferentes del problema abordado por este trabajo. Metodologías como **Agile, DevOps e ITIL** regulan procesos organizacionales y ciclos de entrega. Sistemas como **Git** proporcionan integridad histórica del código fuente. Los marcos contemporáneos de **gobernanza de IA** suelen centrarse en dimensiones éticas, regulatorias o institucionales, como el NIST AI Risk Management Framework [4].

<!-- SEC-07-P006 -->
Janus opera, en cambio, en el **nivel microoperacional de la interacción humano–IA durante la producción técnica**. Sus características distintivas incluyen:

1. **gobernanza basada en evidencia** mediante el modelo `E+` / `E−`;
2. **reconstrucción determinista del estado de gobernanza** mediante registros canónicos de solo anexado;
3. **separación explícita entre generación técnica y autoridad humana** mediante eventos de decisión auditables.

<!-- ERR-04 --><!-- TAB-01 -->
**Tabla I. Comparación conceptual**

| Concepto | Sistemas de control de versiones | Gobernanza organizacional | Janus |
|---|---|---|---|
| Historia del sistema | commits | documentación de procesos | registros de solo anexado |
| Integridad | hashes | auditoría institucional | escritura de auditoría controlada |
| Autorización / rendición de cuentas | pull requests | aprobación jerárquica | `HUMAN_DECISION` |
| Evidencia | historial de commits | informes | `E+` / `E−` |
| Reconstrucción | checkout | reconstrucción documental | reconstrucción determinista |
| Nivel operacional | código | organización | interacción humano–IA |

<!-- SEC-08-P001 -->
## VIII. Limitaciones

Janus:

- no garantiza la seguridad del sistema;
- no sustituye el cumplimiento regulatorio;
- no elimina el error humano;
- no reemplaza marcos éticos organizacionales.

Su alcance es deliberadamente limitado.

<!-- SEC-09-P001 -->
## IX. Conclusión

La integración de inteligencia artificial en el desarrollo de software introduce nuevas ambigüedades sobre autoridad, responsabilidad y validación.

<!-- SEC-09-P002 -->
Mientras los marcos de gobernanza existentes operan principalmente en niveles institucionales, la interacción cotidiana entre desarrolladores humanos y sistemas generativos continúa en gran medida subformalizada.

<!-- SEC-09-P003 -->
Janus propone una capa de microgobernanza diseñada para abordar esta brecha operacional. En lugar de introducir infraestructuras complejas, Janus define un conjunto reducido de invariantes fundacionales de gobernanza capaces de estabilizar sistemas híbridos humano–IA.

<!-- SEC-09-P004 -->
La hipótesis central es que **pequeñas intervenciones estructurales pueden producir mejoras desproporcionadas en la estabilidad de sistemas complejos**.

<!-- SEC-09-P005 -->
De manera similar a como el control de versiones distribuido, las prácticas de revisión de código y la integración continua reformularon la cultura de la ingeniería de software, una capa mínima de gobernanza puede ayudar a reducir la deriva silenciosa, la ambigüedad de responsabilidad y la pérdida de trazabilidad en el desarrollo asistido por IA.

<!-- SEC-09-P006 -->
Por lo tanto, Janus no busca reemplazar los marcos de gobernanza existentes, sino complementarlos abordando la capa microoperacional donde ocurre realmente la colaboración entre seres humanos y máquinas.

<!-- SEC-09-P007 -->
Si los eventos de gobernanza describen por completo la actividad autorizada del sistema, el estado operacional se vuelve derivable del estado de gobernanza. En este sentido, los registros de gobernanza no son meros artefactos de auditoría, sino que pueden funcionar como una descripción estructural reconstruible de la operación del sistema.

<!-- SEC-09-P008 -->
Esta interpretación resalta una implicación más amplia del modelo: la infraestructura de gobernanza también puede operar como mecanismo duradero para preservar memoria institucional en sistemas sociotécnicos. Al registrar eventos de gobernanza, estructuras de evidencia y decisiones humanas explícitas, el sistema preserva una historia reconstruible del conocimiento institucional y la responsabilidad operacional.

## Referencias

[1] E. L. Trist y K. W. Bamforth, “Some Social and Psychological Consequences of the Longwall Method of Coal-Getting”, *Human Relations*, vol. 4, núm. 1, pp. 3–38, 1951.  
[2] J. Kooiman, *Governing as Governance*. Sage Publications, 2003.  
[3] R. C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.  
[4] National Institute of Standards and Technology, “AI Risk Management Framework (AI RMF 1.0)”, NIST, 2023.

---

<!-- ADD-01 -->
## Adenda publicada

Esta adenda alinea el artículo informativo v1.0 con Janus Core Lite v0.2. No altera el depósito DOI inmutable.

<!-- ADD-02-P001 -->
### Registros canónicos y correcciones

`MANAGEMENT_LOG` registra la actividad de dominio y sus correcciones. `SCHEMA_LOG` registra las definiciones estructurales y la evolución de esquemas utilizadas para interpretar registros. `AUDIT_LOG` registra eventos de gobernanza, registros de rendición de cuentas y hallazgos de auditoría. Las correcciones se anexan en el registro correspondiente; una interpretación, autorización o declaración posterior sobre un evento de gobernanza se registra únicamente mediante `HUMAN_DECISION`.

<!-- ADD-03-P001 -->
### Evidencia y autoridad

Según Core Lite v0.2, `E+` y `E−` son clases de evidencia, no etiquetas booleanas ni tipos de evento. `E−` requiere una expectativa versionada registrada antes de la observación, un alcance y cutoff deterministas, el contexto aplicable de `SCHEMA_LOG` y una observación reproducible.

<!-- ADD-03-P002 -->
En la Figura 1, `HUMAN_DECISION` se requiere únicamente cuando un resultado exige rendición de cuentas humana explícita. Los flujos de evaluación pueden producir `OMISSION_DETECTED`; no originan `HUMAN_DECISION`.

<!-- ADD-04-P001 -->
### Afirmaciones de reconstrucción

La Ecuación (2) es un modelo conceptual. Core Lite v0.2 establece que una implementación **SHOULD** poder reconstruir vistas y hallazgos relevantes para la gobernanza a partir de todos los registros, los esquemas relevantes y los artefactos de evidencia referenciados hasta un cutoff. Core no define el eje temporal representado por `t`.

<!-- ADD-04-P002 -->
La Ecuación (4) y la transición final de la Figura 2 son una hipótesis condicional externa a Janus Core. No convierten a `AUDIT_LOG` en el registro primario del dominio ni afirman que un estado operacional arbitrario sea reconstruible desde el estado de gobernanza.

<!-- ADD-05-P001 -->
### Perfil operacional

El congelamiento de baseline, los gates de validación, la telemetría estructurada y la validación de identidad estructural son opciones de framework o implementación. No son invariantes adicionales de Core.

<!-- ADD-06-P001 -->
### Estado de la validación informada

La Sección VI describe una autoaplicación interna preliminar, no una evaluación empírica controlada. Existe localmente un artefacto fechado de validación de seis casos, pero fue introducido el 13 de marzo de 2026, después del tag del paper v1.0 fechado el 10 de marzo de 2026. Por ello no fundamenta de manera independiente los resultados tal como fueron informados en la publicación inmutable. Hasta que se produzcan y revisen artefactos contemporáneos, las expresiones “estabilidad estructural”, “coherencia contractual”, “detección estructural de inconsistencias” y “reproducibilidad controlada” deben leerse como observaciones de práctica y no como resultados empíricos validados.

