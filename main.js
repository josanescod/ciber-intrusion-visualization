const width = 900;
const height = 600;
const margin = { top: 40, right: 40, bottom: 70, left: 80 };
const svg = d3.select("svg");
const tooltip = d3.select(".tooltip");

let allData = [];
let x, y, r, color;

function BubbleVisualization() {
    // Escales
    x = d3.scaleLog()
        .domain(d3.extent(allData, d => d.packet_rate))
        .range([margin.left, width - margin.right]);

    y = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.failed_login_ratio))
        .nice()
        .range([height - margin.bottom, margin.top]);

    r = d3.scaleSqrt()
        .domain(d3.extent(allData, d => d.session_duration))
        .range([3, 18]);

    color = d3.scaleOrdinal()
        .domain([0, 1])
        .range(["#69b3a2", "#d95f02"]);

    // Bombolles (primer!)
    svg.append("g")
        .attr("class", "circles")
        .selectAll("circle")
        .data(allData)
        .join("circle")
        .attr("cx", d => x(d.packet_rate))
        .attr("cy", d => y(d.failed_login_ratio))
        .attr("r", d => r(d.session_duration))
        .attr("fill", d => color(d.attack_detected))
        .attr("opacity", 0.7)
        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Attack:</strong> ${d.attack_detected}<br>
                    Packet rate: ${d.packet_rate.toFixed(2)}<br>
                    Failed ratio: ${d.failed_login_ratio.toFixed(2)}<br>
                    Duration: ${d.session_duration.toFixed(0)} s
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Eixos (després!)
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // Etiqueta eix X
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 15)
        .text("Packet rate (intensitat del tràfic)");

    // Etiqueta eix Y
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .text("Failed login ratio");

    // Event listeners per als filtres
    d3.select("#showAttacks").on("change", function () {
        updateFilters("showAttacks");
    });
    d3.select("#showNormal").on("change", function () {
        updateFilters("showNormal");
    });
}

function updateFilters(clickedId) {
    const showAttacks = d3.select("#showAttacks").property("checked");
    const showNormal = d3.select("#showNormal").property("checked");

    // Lògica mútuament exclusiva
    if (showAttacks && showNormal) {
        // Si tots dos estan seleccionats, deseleccionar l'altre
        if (clickedId === "showAttacks") {
            d3.select("#showNormal").property("checked", false);
        } else if (clickedId === "showNormal") {
            d3.select("#showAttacks").property("checked", false);
        }
    }

    // Actualitzar els valors després de la lògica
    const finalShowAttacks = d3.select("#showAttacks").property("checked");
    const finalShowNormal = d3.select("#showNormal").property("checked");

    // Seleccionar tots els cercles
    svg.selectAll("circle")
        .transition()
        .duration(500)
        .style("opacity", function (d) {
            // Cas: Cap seleccionat → mostrar tot
            if (!finalShowAttacks && !finalShowNormal) {
                return 0.7;
            }
            // Cas: Només atacs seleccionat
            if (finalShowAttacks && !finalShowNormal) {
                return d.attack_detected === 1 ? 0.7 : 0;
            }
            // Cas: Només normals seleccionat
            if (!finalShowAttacks && finalShowNormal) {
                return d.attack_detected === 0 ? 0.7 : 0;
            }
            return 0.7;
        })
        .style("pointer-events", function (d) {
            // Desactivar events en cercles invisibles
            if (!finalShowAttacks && !finalShowNormal) return "all";
            if (finalShowAttacks && !finalShowNormal) {
                return d.attack_detected === 1 ? "all" : "none";
            }
            if (!finalShowAttacks && finalShowNormal) {
                return d.attack_detected === 0 ? "all" : "none";
            }
            return "all";
        });
}

function ParallelCoordinates() {
    const svgPar = d3.select("#parallel");
    const widthPar = +svgPar.attr("width");
    const heightPar = +svgPar.attr("height");
    const marginPar = { top: 40, right: 50, bottom: 20, left: 50 };

    const innerWidth = widthPar - marginPar.left - marginPar.right;
    const innerHeight = heightPar - marginPar.top - marginPar.bottom;

    const g = svgPar.append("g")
        .attr("transform", `translate(${marginPar.left},${marginPar.top})`);

    // Variables a representar
    const dimensions = [
        "packet_rate",
        "session_duration",
        "failed_login_ratio",
        "ip_reputation_score"
    ];

    // Escales Y per cada dimensió
    const yScales = {};
    dimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(allData, d => +d[dim]))
            .range([innerHeight, 0]);
    });

    // Escala X per la posició dels eixos
    const xScale = d3.scalePoint()
        .domain(dimensions)
        .range([0, innerWidth])
        .padding(0.5);

    // Color segons unusual_time_access
    const colorPar = d3.scaleOrdinal()
        .domain([0, 1])
        .range(["#69b3a2", "#d95f02"]);

    // Funció per dibuixar línies
    function path(d) {
        return d3.line()(dimensions.map(dim => [
            xScale(dim),
            yScales[dim](d[dim])
        ]));
    }

    // Línies
    const lines = g.append("g")
        .attr("class", "lines")
        .selectAll("path")
        .data(allData)
        .join("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => colorPar(d.unusual_time_access))
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.35)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .attr("stroke-width", 3)
                .attr("stroke-opacity", 1);

            tooltip
                .style("opacity", 1)
                .html(`
                <strong>Session:</strong> ${d.session_id}<br>
                <strong>Packet rate:</strong> ${d.packet_rate.toFixed(2)}<br>
                <strong>Duration:</strong> ${d.session_duration.toFixed(0)} s<br>
                <strong>Failed ratio:</strong> ${d.failed_login_ratio.toFixed(2)}<br>
                <strong>IP reputation:</strong> ${d.ip_reputation_score.toFixed(2)}<br>
                <strong>UTA:</strong> ${d.unusual_time_access}
            `);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .attr("stroke-width", 1)
                .attr("stroke-opacity", 0.35);

            tooltip.style("opacity", 0);
        });

    // Eixos + Brush
    const axisGroup = g.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${xScale(d)},0)`);

    axisGroup.each(function (dim) {
        d3.select(this).call(d3.axisLeft(yScales[dim]));

        d3.select(this)
            .append("text")
            .attr("class", "axis-title")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", -marginPar.top / 2)
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .style("fill", "#333")
            .text(dim);

        // Brush
        d3.select(this)
            .append("g")
            .attr("class", "brush")
            .call(
                d3.brushY()
                    .extent([[-10, 0], [10, innerHeight]])
                    .on("brush end", brushed)
            );
    });

    // Funció de filtratge amb brush
    function brushed() {
        const actives = [];

        axisGroup.each(function (dim) {
            const brushSel = d3.brushSelection(d3.select(this).select(".brush").node());
            if (brushSel) {
                actives.push({
                    dim: dim,
                    extent: brushSel.map(yScales[dim].invert)
                });
            }
        });

        lines.attr("stroke-opacity", d => {
            return actives.every(filter => {
                const val = d[filter.dim];
                return val <= filter.extent[0] && val >= filter.extent[1];
            })
                ? 0.9
                : 0.05;
        });
    }

    
    // FILTRES PER UTA (igual que scatter)
    function updateParallelFilters(clickedId) {
        const showUTA1 = d3.select("#showUTA1").property("checked");
        const showUTA0 = d3.select("#showUTA0").property("checked");

        // Lògica mútuament exclusiva
        if (showUTA1 && showUTA0) {
            // Si tots dos estan seleccionats, deseleccionar l'altre
            if (clickedId === "showUTA1") {
                d3.select("#showUTA0").property("checked", false);
            } else if (clickedId === "showUTA0") {
                d3.select("#showUTA1").property("checked", false);
            }
        }

        // Actualitzar els valors després de la lògica
        const finalShowUTA1 = d3.select("#showUTA1").property("checked");
        const finalShowUTA0 = d3.select("#showUTA0").property("checked");

        lines
            .transition()
            .duration(400)
            .attr("stroke-opacity", d => {
                // Cap seleccionat → mostrar tot
                if (!finalShowUTA1 && !finalShowUTA0) return 0.35;
                // Només UTA1 seleccionat
                if (finalShowUTA1 && !finalShowUTA0) return d.unusual_time_access === 1 ? 0.35 : 0;
                // Només UTA0 seleccionat
                if (!finalShowUTA1 && finalShowUTA0) return d.unusual_time_access === 0 ? 0.35 : 0;
                return 0.35;
            })
            .style("pointer-events", d => {
                if (!finalShowUTA1 && !finalShowUTA0) return "all";
                if (finalShowUTA1 && !finalShowUTA0) return d.unusual_time_access === 1 ? "all" : "none";
                if (!finalShowUTA1 && finalShowUTA0) return d.unusual_time_access === 0 ? "all" : "none";
                return "all";
            });
    }

    d3.select("#showUTA1").on("change", function () {
        updateParallelFilters("showUTA1");
    });
    d3.select("#showUTA0").on("change", function () {
        updateParallelFilters("showUTA0");
    });
    
}

// Radial Bar Chart
function RadialBarChart() {
    const svgRad = d3.select("#radial");
    const width = +svgRad.attr("width");
    const height = +svgRad.attr("height");
    const radius = Math.min(width, height) / 2 - 100;

    const tooltip = d3.select(".tooltip");

    let category = "protocol_type";
    let mode = "count";

    function draw() {
        svgRad.selectAll("*").remove();

        const g = svgRad.append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const riskLevels = ["Low", "Medium", "High", "Confirmed"];

        // Normalització encryption_used
        if (category === "encryption_used") {
            allData.forEach(d => {
                if (d.encryption_used == null) {
                    d.encryption_used = "No encrypt";
                }
            });
        }

        const groups = Array.from(new Set(allData.map(d => d[category])));

        const grouped = d3.rollup(
            allData,
            v => ({
                total: v.length,
                riskCounts: {
                    Low: v.filter(d => d.risk_level === "Low").length,
                    Medium: v.filter(d => d.risk_level === "Medium").length,
                    High: v.filter(d => d.risk_level === "High").length,
                    Confirmed: v.filter(d => d.risk_level === "Confirmed").length
                },
                attackRate: d3.mean(v, d => d.attack_detected)
            }),
            d => d[category]
        );

        const data = Array.from(grouped, ([key, values]) => ({
            key,
            ...values
        }));

        // Escales
        const angle = d3.scaleBand()
            .domain(groups)
            .range([0, 2 * Math.PI])
            .padding(0.1);

        const maxValue = d3.max(data, d => d.total);

        const radiusScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, radius]);

        const colorRisk = d3.scaleOrdinal()
            .domain(riskLevels)
            .range(["#69b3a2", "#fdd835", "#fb8c00", "#8b0000"]);

        // GRAELLA RADIAL amb animació
        const grid = g.append("g")
            .attr("class", "grid")
            .style("opacity", 0);

        const gridLevels = 5;

        // Cercles concèntrics amb animació
        for (let i = 1; i <= gridLevels; i++) {
            grid.append("circle")
                .attr("r", 0)
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 0.8)
                .attr("stroke-dasharray", "4,4")
                .transition()
                .duration(400)
                .delay(i * 40)
                .ease(d3.easeCircleOut)
                .attr("r", radius * (i / gridLevels));
        }

        // Etiquetes radials amb animació
        for (let i = 1; i <= gridLevels; i++) {
            const value = mode === "count"
                ? Math.round(maxValue * (i / gridLevels))
                : Math.round((i / gridLevels) * 100) + "%";

            grid.append("text")
                .attr("x", 0)
                .attr("y", -radius * (i / gridLevels))
                .attr("dy", "-4px")
                .attr("text-anchor", "middle")
                .style("font-size", "11px")
                .style("fill", "#666")
                .style("opacity", 0)
                .text(value)
                .transition()
                .duration(300)
                .delay(300 + i * 40)
                .style("opacity", 1);
        }

        // Animació del grid complet
        grid.transition()
            .duration(300)
            .style("opacity", 1);

        // LÍNIES RADIALS amb animació
        grid.selectAll(".radial-line")
            .data(groups)
            .enter()
            .append("line")
            .attr("class", "radial-line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 0)
            .attr("stroke", "#ccc")
            .attr("stroke-width", 0.8)
            .attr("stroke-dasharray", "4,4")
            .transition()
            .duration(400)
            .delay((d, i) => 200 + i * 30)
            .ease(d3.easeQuadOut)
            .attr("x2", d => Math.sin(angle(d) + angle.bandwidth() / 2) * radius)
            .attr("y2", d => -Math.cos(angle(d) + angle.bandwidth() / 2) * radius);

        // BARRES APILADES amb animació
        data.forEach((d, dataIndex) => {
            let start = 0;

            riskLevels.forEach((risk, riskIndex) => {
                let value = d.riskCounts[risk];
                if (mode === "percent") {
                    value = (value / d.total) * maxValue;
                }

                // Guardem els valors finals per a l'animació
                const finalInnerRadius = radiusScale(start);
                const finalOuterRadius = radiusScale(start + value);
                const startAngle = angle(d.key);
                const endAngle = angle(d.key) + angle.bandwidth();

                const path = g.append("path")
                    .attr("fill", colorRisk(risk))
                    .attr("stroke", "white")
                    .attr("stroke-width", 1.5)
                    .datum({
                        innerRadius: finalInnerRadius,
                        outerRadius: finalOuterRadius,
                        startAngle: startAngle,
                        endAngle: endAngle,
                        data: d,
                        risk: risk
                    })
                    .attr("d", d3.arc()
                        .innerRadius(0)
                        .outerRadius(0)
                        .startAngle(startAngle)
                        .endAngle(endAngle)
                    )
                    .on("mouseover", function (event, arcData) {
                        // Highlight effect
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("stroke-width", 3);

                        tooltip
                            .style("opacity", 1)
                            .html(`
                                <strong>${category}:</strong> ${arcData.data.key}<br>
                                <strong>Risk:</strong> ${arcData.risk}<br>
                                <strong>Sessions:</strong> ${arcData.data.riskCounts[arcData.risk]}<br>
                                <strong>Attack rate:</strong> ${(arcData.data.attackRate * 100).toFixed(1)}%
                            `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 20) + "px");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("stroke-width", 1.5);

                        tooltip.style("opacity", 0);
                    });

                // Animació de creixement radial
                path.transition()
                    .duration(600)
                    .delay(400 + dataIndex * 40 + riskIndex * 80)
                    .ease(d3.easeCubicOut)
                    .attrTween("d", function (arcData) {
                        const interpolateInner = d3.interpolate(0, arcData.innerRadius);
                        const interpolateOuter = d3.interpolate(0, arcData.outerRadius);

                        return function (t) {
                            return d3.arc()
                                .innerRadius(interpolateInner(t))
                                .outerRadius(interpolateOuter(t))
                                .startAngle(arcData.startAngle)
                                .endAngle(arcData.endAngle)
                                ();
                        };
                    });

                start += value;
            });
        });

        // ETIQUETES DE CATEGORIA amb animació
        g.selectAll(".label")
            .data(data)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("text-anchor", "middle")
            .attr("x", d => Math.sin(angle(d.key) + angle.bandwidth() / 2) * (radius + 30))
            .attr("y", d => -Math.cos(angle(d.key) + angle.bandwidth() / 2) * (radius + 30))
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("opacity", 0)
            .text(d => d.key)
            .transition()
            .duration(400)
            .delay((d, i) => 800 + i * 40)
            .style("opacity", 1);

        // LLEGENDA amb animació
        const legend = svgRad.append("g")
            .attr("transform", "translate(20,20)")
            .style("opacity", 0);

        riskLevels.forEach((risk, i) => {
            const row = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);

            row.append("rect")
                .attr("width", 14)
                .attr("height", 14)
                .attr("fill", colorRisk(risk));

            row.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("font-size", "12px")
                .text(risk);
        });

        // Animació de la llegenda
        legend.transition()
            .duration(400)
            .delay(1000)
            .style("opacity", 1);
    }

    // Controls
    d3.selectAll("input[name='radialMode']").on("change", function () {
        mode = this.value;
        draw();
    });

    d3.selectAll("input[name='radialCategory']").on("change", function () {
        category = this.value;
        draw();
    });

    draw();
}

// Cridar la funció després de carregar dades
d3.csv("datasets/cybersecurity_intrusion_data_clipped_outliers.csv", d3.autoType)
    .then(data => {
        allData = data;
        BubbleVisualization();      // Primera visualització
        ParallelCoordinates(); // Segona visualització
        RadialBarChart(); // Tercera visualització
    });
