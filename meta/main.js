import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  console.log(data);
  return data;
}
let data = await loadData();
let commitProgress = 100;


function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];

      
      let { author, date, time, timezone, datetime } = first;

       let ret = {
        id: commit,
        url: 'https://github.com/d9ha-cell/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: true,
        writable: true,
        enumerable: false,
      });

      return ret;
    });
}
    


let commits = processCommits(data);
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

function onTimeSliderChange() {
  commitProgress = Number(document.querySelector('#commit-progress').value);

  commitMaxTime = timeScale.invert(commitProgress);

  document.querySelector('#commit-time').textContent = 
    commitMaxTime.toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

  const filteredCommits = commits.filter(
    (d) => d.datetime <= commitMaxTime

  );
  renderScatterPlot(data, filteredCommits);

  const filteredData = data.filter(d => d.datetime <= commitMaxTime);

  renderFileVisualization(filteredData);
}

document
  .querySelector('#commit-progress')
  .addEventListener('input', onTimeSliderChange);

onTimeSliderChange();

console.log(commits);

function renderScatterPlot(data, commits)
{
    const width =1000;
    const height =600;

    
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };


    const svg = d3
        .select('#chart')
        .selectAll('svg')
        .data([null])
        .join('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');



    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    
    const xScale = d3
        .scaleTime()
        
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();

    
    
    const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);
    const xAxis = d3.axisBottom(xScale);
    
    const gridlines = svg
      .selectAll('gridlines')
      .data([null])
      .join('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${usableArea.left}, 0)`) 
    
    gridlines.call(
            d3.axisLeft(yScale)
                .tickFormat('')
                .tickSize(-usableArea.width)
        );
        
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');


    svg
        .selectAll('.x-axis')
        .data([null])
        .join('g')
        .attr('class', 'x-axis') 
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);


    svg
        .selectAll('.y-axis')
        .data([null])
        .join('g')
        .attr('class', 'y-axis') 
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);



    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    const dots = svg
        .selectAll('.dots')
        .data([null])
        .join('g')
        .attr('class', 'dots');

    dots
         .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines)) 
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateToolPosition(event);
            d3.select(event.currentTarget).style('fill-opacity', 1);
        })
        .on('mouseleave', (event) => {
            updateTooltipVisibility(false);
            d3.select(event.currentTarget).style('fill-opacity', 0.7)

        });

         createBrushSelector(svg, xScale, yScale);
}

function createBrushSelector(svg, xScale, yScale)
{
    svg.call(d3.brush().on('start brush end', (event) => brushed(event, xScale, yScale)));

    svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event, xScale, yScale) {
    const selection = event.selection;

    d3.selectAll('.dots circle')
        .classed('selected', (d) => isCommitSelected(selection, d, xScale, yScale));

    
    renderSelectionCount(selection, xScale, yScale);

    renderLanguageBreakdown(selection, xScale, yScale);

}


function isCommitSelected(selection, commit, xScale, yScale){
    
    if(!selection) return false;

    const [[x0, y0], [x1, y1]] = selection;

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection, xScale, yScale) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d, xScale, yScale))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection, xScale, yScale) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d, xScale, yScale))
    : [];
  const container = document.getElementById('language-breakdown');

  //if (selectedCommits.length === 0) {
    //container.innerHTML = '';
    //return;
  //}
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  
  
  
  const lines = requiredCommits.flatMap((d) => d.lines);

  
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    
    
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}


function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  
  
  const date = document.getElementById('commit-date');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
}

function updateTooltipVisibility(isVisible) {
    
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateToolPosition(event) {
    
    const tooltip = document.getElementById('commit-tooltip');

    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}





function renderCommitInfo(data, commits) {
  

  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const fileCount = d3.group(data, d => d.file).size;

  dl.append('dt').text('Total files');
  dl.append('dd').text(fileCount);

  const fileLengths = d3.rollups(
  data,
  (v) => d3.max(v, (v) => v.line),
  (d) => d.file,
);

const averageFileLength = d3.mean(fileLengths, (d) => d[1]);

dl.append('dt').text('Average file length');
dl.append('dd').text(averageFileLength.toFixed(1));

const maxDepth = d3.max(data, d => d.depth);

dl.append('dt').text('Maximum depth');
dl.append('dd').text(maxDepth);
}



renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		
    I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		
    I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		
    Then I looked over all I had made, and I saw that it was very good.
	`,
  );

  d3.select('#file-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(d => 
      'On ' + 
      d.datetime.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
      }) + 
      ', I made <a href "${d.url}" target= "_blank"> another glorious commit</a>. ' +
      'I edited' + d.totalLines + ' lines across ' + 
      d3.group(d.lines, line => line.file).size + 
      ' files. Then I looked over all I had made, and I saw that it was very good.'
      );

  const scroller =scrollama();

  scroller
    .setup({
      step: '#scatter-story .step',
      offset: 0.5,
      debug: false,
    })
    .onStepEnter((response) => {
      const commit = response.element.__data__;

      const commitIndex = commits.indexOf(commit);
      const progress = (commitIndex / (commits.length - 1)) * 100;

      
      document.querySelector('#commit-progress').value = progress;


      onTimeSliderChange();


    });

  const fileScroller = scrollama();

  fileScroller
    .setup({
      step: '#file-story .step',
      offset: 0.5,
      
      debug: false,
    })

    .onStepEnter(response => {
      const commit = response.element.__data__;

      const filteredData = data.filter(
        d => d.datetime <= commit.datetime
      );

      
      console.log('Visible lines:', filteredData.length);
      renderFileVisualization(filteredData);

    });

function renderFileVisualization(data){
  
  
  const files = d3
    .groups(data, d => d.file)
    .sort((a, b) => b[1].length - a[1].length);

  d3.select('#files')
    .selectAll('dt')
    .data(files)
    .join('dt')
    .text(d => d[0]);    

  d3.select('#files')
    .selectAll('dd')
    .data(files)
    .join('dd')
    .selectAll('div')
    .data(d => d[1])
    .join('div')
    .attr('class', 'line')
    .style('background-color', d => {
      const type = d.file.split('.').pop();
      return d3.schemeTableau10[
        ['js', 'css', 'html', 'py', 'json', 'md'].indexOf(type) % 10

      ] || 'royalblue';
    })
}

renderFileVisualization(data);