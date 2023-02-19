var selectedYearRange, selectedUnit, selectedAttribute,category_sum , selectedCountries = [];
var width = 600, height = 600;

document.addEventListener('DOMContentLoaded', () => {

    // Load both files before doing anything else
    Promise.all([d3.json('data/world.geojson'),
                 d3.csv('data/eurostat_data.csv')])
                 .then(function(values){


        mapData = values[0];
        wasteData = values[1];

        wasteData = wasteData.filter(d=>{return d.Value !== ':'})

         wasteData.forEach(element => {
            if(element.GEO === 'Germany (until 1990 former territory of the FRG)') { element.GEO = "Germany";}
            if(element.GEO === 'Czechia') { element.GEO = "Czech Republic";}
            if(element.GEO === 'United Kingdom') { element.GEO = "England";}
            element.TIME = +element.TIME;
            element.Value = parseInt(element.Value.replace(/,/g, ''));

        });

        slider();
        drawMap();
        drawLine();
    });
});

function drawLine(){
    var margin = {top: 30, right: 120, bottom: 30, left: 80},
    width = 600 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

    LineSvg = d3.select('#linechart').attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 "+(width+ margin.left+margin.right)+" "+(height + margin.top + margin.bottom))

    LineSvg.select('g').remove();

    var parseDate = d3.timeParse("%Y");

    var x = d3.scaleTime().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]).nice();

    var Line = d3.line()
                        .x(function(d) { return x(d.Year); })
                        .y(function(d) { return y(d[selectedAttribute]); });


    //set the color range
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    svg = LineSvg.append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

    lineData = []

    category_sum.forEach(element=>{
        if((selectedCountries.indexOf(element.key) !== -1)){
            yearNest = d3.nest().key(function(d) {return d.TIME;}).entries(element.values)
            yearData = []
            yearNest.forEach(a=>{
                yearData.push({Year : parseDate(a.key), ['Waste generated']:a.values[0].Value, Recovery:a.values[1].Value,
                                Difference:a.values[0].Value - a.values[1].Value})
            })
            lineData.push({key:element.key, values:yearData})
        }

      })

      x.domain([parseDate(selectedYearRange[0]),parseDate(selectedYearRange[1]) ]);
      y.domain([d3.min(lineData, function(c) { return d3.min(c.values, function(d) { return d[selectedAttribute]; }); }) - 5, d3.max(lineData, function(c) { return d3.max(c.values, function(d) { return d[selectedAttribute]; }); })]);

      // Add the X Axis
    svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(3));

    // Add the Y Axis
     svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y));

    count = 0

      lineData.forEach(d=>{
        svg.append("path")
        .attr("class", "line")
        .attr("d", Line(d.values))
        .attr('fill' , 'none')
            .attr("stroke-width", 3)
            .style("stroke", function() { // Add the colours dynamically
            return d.color = color(d.key); })
        .style('opacity' , '1')

        for (let dValue of d.values) {
            svg.append("circle")
                .attr("stroke", "none")
                .attr("cx", function(d) { return x(dValue.Year) })
                .attr("cy", function(d) { return y(dValue[selectedAttribute]) })
                .style("fill", function() { // Add the colours dynamically
                    return d.color = color(d.key); })
                .attr("r", 4)
        }

        svg.append("text")
                        .attr("x", width+25)
                        .attr("y", (10 + count*25))
                        .attr("class", "legend")
                        .attr('id' , 'foreground')
                        .style("fill", function() { // Add the colours dynamically
                            return d.color = color(d.key); })
                        .text(d.key)
                        .style("font-size", "15px")

          svg.append("rect")
              .attr("x", width + 10)
              .attr("y", (count*25))
              .attr("width", 10)
              .attr("height", 10)
              .style("fill", function() { // Add the colours dynamically
                  return d.color = color(d.key); });

        count = count + 1
      })
    
      // text label for the y axis
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(selectedUnit);


}

function drawMap(){
    mapSvg = d3.select('#mapChart').attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 "+width+" "+height)

    mapSvg.select('g').remove();

    //filter data based on the attributes set
    var filteredData = wasteData.filter(d=>{return ((d.TIME>= selectedYearRange[0])&&(d.TIME <= selectedYearRange[1])
                                                        &&(d.UNIT === selectedUnit)
                                                        )})

    category_sum = d3.nest().key(function(d) {return d.GEO;})
      .entries(filteredData);

      CountryData = []

      category_sum.forEach(element=>{
        var Generated = element.values.filter(d=>{return d.WST_OPER === 'Waste generated'})
        const sumGenerated = d3.sum(Generated, d=>{return +d.Value})
        var Recovered = element.values.filter(d=>{return d.WST_OPER === 'Recovery'})
        const sumRecovered = d3.sum(Recovered, d=>{return +d.Value})
        CountryData.push({Country:element.key,['Waste generated']: sumGenerated , Recovery:sumRecovered,
                             Difference:sumGenerated-sumRecovered})
      })
      facts = { ['Waste generated']: {} , Recovery:{} , Difference:{} }
        for (i in CountryData) {
                 facts['Waste generated'][CountryData[i]["Country"]] = +CountryData[i]['Waste generated'];
                 facts.Recovery[CountryData[i]["Country"]] = +CountryData[i].Recovery;
                 facts.Difference[CountryData[i]["Country"]] = +CountryData[i].Difference;
                }

    // Get the min and max value based on the currently selected year
    let extent =d3.extent(Object.values(facts[selectedAttribute]));

    colorScale = d3.scaleSequential(d3['interpolateBlues'])
    .domain(extent);

    let Projection = d3.geoNaturalEarth2()
    .fitSize([+mapSvg.style('width').replace('px',''),
              500],
              mapData);
    let geoPath = d3.geoPath()
    .projection(Projection);

    let g = mapSvg.append('g');
    let map = g.append("g");

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            return "Country: " + d.properties.name+  "<br/>Year: " + selectedYearRange[0] +"-"+selectedYearRange[1]
                +"<br/>Waste Generated: " +facts['Waste generated'][d.properties.name].toFixed(0)
                +"<br/>Recovery: " +facts.Recovery[d.properties.name].toFixed(0)
                +"<br/>Difference: " +facts.Difference[d.properties.name].toFixed(0);
        });
    map.call(tip);

    map.selectAll('.stateMap')
          .data(mapData.features)
          .enter()
          .append('path')
            .attr('d',geoPath)
            .classed('stateMap',true)
            .attr("stroke-width" , '1px')
            .attr("stroke" , 'black')
            .attr('fill' , function(d){
                if(facts[selectedAttribute][d.properties.name] === undefined){
                    return 'white' }
                else{
                    return colorScale(facts[selectedAttribute][d.properties.name]) }
                })
            .on('mouseover', function(d, i) {
                tip.show(d, this),
                    d3.select(this).attr("stroke-width" , '4px')
            })
            .on('mouseout', function(d, i) {
                tip.hide(d, this),
                    d3.select(this).attr("stroke-width" , '1px')
            })
            .on('click', function(d,i) {
                    var countryName = d.properties.name;
                    if (!selectedCountries.includes(countryName)) {
                        selectedCountries.push(countryName);
                        drawLine();
                    } else {
                        var index = selectedCountries.indexOf(countryName);
                        selectedCountries.splice(index, 1);
                        drawLine();
                    }
                })

    //draw legend
    d3.selectAll('div#wrapper svg#map g text').remove()
    d3.selectAll('div#wrapper svg#map g g.colorLegend').remove()
    d3.selectAll('div#wrapper svg#map g defs').remove()
    const linearGradient = g.append("defs")
                            .append("linearGradient")
                            .attr("id", "linear-gradient");
    linearGradient.selectAll("stop")
                  .data(colorScale.ticks()
                  .map((t, i, n) => ({
                    offset: `${100*i/n.length}%`,
                    color: colorScale(t) })))
                  .enter()
                    .append("stop")
                    .attr("offset", d => d.offset)
                    .attr("stop-color", d => d.color);
    g.append("rect")
     .attr('transform', `translate(100,520)`)
     .attr("width", 400)
     .attr("height", 20)
     .style("fill", "url(#linear-gradient)");
    const colorAxis = d3.axisBottom(d3.scaleLinear()
                        .domain(colorScale.domain())
                        .range([0,400]))
                        .ticks(5).tickSize(-20);
    g.append('g').call(colorAxis)
     .attr('class','colorLegend')
     .attr('transform','translate(100,540)')
     .selectAll('text')
     .style('text-anchor','middle')
     .attr('dy', '10px')

    g.append('text')
     .attr('x',120)
     .attr('y',580)
     .style('font-size','.9em')
     .text(selectedAttribute);


}

function slider(){
    var data = [2012, 2020];
    var sliderRange = d3
    .sliderBottom()
    .min(d3.min(data))
    .max(d3.max(data))
    .width(300)
    .tickFormat(d3.format('d'))
    .ticks(5)
    .step(1)
    .default([2012, 2020])
    .fill('red')
    .on('onchange', val => {
        selectedYearRange = val;
        drawMap();
        drawLine();
    });

  var gRange = d3
    .select('div#slider-range')
    .append('svg').attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 "+400+" "+100)
    .append('g')
    .attr('transform', 'translate(30,30)');

  gRange.call(sliderRange);

}
