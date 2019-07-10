// Parallel Coordinates
// Copyright (c) 2012, Kai Chang
// Released under the BSD License: http://opensource.org/licenses/BSD-3-Clause
// 上記をreact componentに変更、brush選択のcallback を用意
import React, { Component } from 'react'
import * as d3 from 'd3';
import * as _ from 'underscore';
import './parallel.css';

class ParallelCoodinatePlot extends Component {
  constructor(props) {
    // props.callback: 洗濯中のデータのリストを引数に、このviewのアップデートのたび走る
    // props.csvpath: csv の置き場()
    super(props)
    this.createParallelCoodinate = this.createParallelCoodinate.bind(this)

  }

  componentDidMount() {
    this.createParallelCoodinate()
  }

  componentDidUpdate() {
    this.createParallelCoodinate()
  }

  createParallelCoodinate() {
    const _self = this;

    var width = document.body.clientWidth,
        height = d3.max([document.body.clientHeight - 540, 240]);

    var m = [60, 0, 10, 0],
        w = width - m[1] - m[3],
        h = height - m[0] - m[2],
        xscale = d3.scalePoint().range([15, w-15]).padding(.1),
        yscale = {},
        dragging = {},
        line = d3.line(),
        axis = d3.axisLeft().ticks(1 + height / 50),
        data,
        foreground,
        background,
        highlighted,
        dimensions,
        render_speed = 50,
        brush_count = 0,
        excluded_groups = [];

    /*
    var colors = {
      "Baby Foods": [185, 56, 73],
      "Baked Products": [37, 50, 75],
      "Beef Products": [325, 50, 39],
      "Beverages": [10, 28, 67],
      "Breakfast Cereals": [271, 39, 57],
      "Cereal Grains and Pasta": [56, 58, 73],
      "Dairy and Egg Products": [28, 100, 52],
      "Ethnic Foods": [41, 75, 61],
      "Fast Foods": [60, 86, 61],
      "Fats and Oils": [30, 100, 73],
      "Finfish and Shellfish Products": [318, 65, 67],
      "Fruits and Fruit Juices": [274, 30, 76],
      "Lamb, Veal, and Game Products": [20, 49, 49],
      "Legumes and Legume Products": [334, 80, 84],
      "Meals, Entrees, and Sidedishes": [185, 80, 45],
      "Nut and Seed Products": [10, 30, 42],
      "Pork Products": [339, 60, 49],
      "Poultry Products": [359, 69, 49],
      "Restaurant Foods": [204, 70, 41],
      "Sausages and Luncheon Meats": [1, 100, 79],
      "Snacks": [189, 57, 75],
      "Soups, Sauces, and Gravies": [110, 57, 70],
      "Spices and Herbs": [214, 55, 79],
      "Sweets": [339, 60, 75],
      "Vegetables and Vegetable Products": [120, 56, 40],
      "no_group": [0, 0, 250]
    };

     */

    function num_sort(o1, o2) {
        return o1-o2;
    }

    // Scale chart and canvas height
    d3.select("#chart")
        .style("height", (h + m[0] + m[2]) + "px")

    d3.selectAll("canvas")
        .attr("width", w)
        .attr("height", h)
        .style("padding", m.join("px ") + "px");


    // Foreground canvas for primary view
    foreground = document.getElementById('foreground').getContext('2d');
    foreground.globalCompositeOperation = "destination-over";
    foreground.strokeStyle = "rgba(0,100,160,0.1)";
    foreground.lineWidth = 1.7;
    foreground.fillText("Loading...", w / 2, h / 2);

    // Highlight canvas for temporary interactions
    highlighted = document.getElementById('highlight').getContext('2d');
    highlighted.strokeStyle = "rgba(0,100,160,1)";
    highlighted.lineWidth = 4;

    // Background canvas
    background = document.getElementById('background').getContext('2d');
    background.strokeStyle = "rgba(0,100,160,0.1)";
    background.lineWidth = 1.7;

    // SVG for ticks, labels, and interactions
    var svg = d3.select( this.node )
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2])
        .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    // Load the data and visualization
    d3.csv(_self.props.csvpath).then(function (raw_data) {
      // Convert quantitative scales to floats
      data = raw_data.map(function (d) {
        for (var k in d) {
          if (!_.isNaN(raw_data[0][k] - 0)) {
            d[k] = parseFloat(d[k]) || 0;
          }
        }
        ;
        return d;
      });

      // Extract the list of numerical dimensions and create a scale for each.
      dimensions = d3.keys(data[0]).filter( (k) => { return (_.isNumber(data[0][k]))});
      xscale.domain(dimensions);
      dimensions.forEach((k) => {
          yscale[k] = d3.scaleLinear()
              .domain(d3.extent(data, function (d) {
              return +d[k];
            }))
              .range([h, 0])
      });

      // Add a group element for each dimension.
      var g = svg.selectAll(".dimension")
          .data(dimensions)
          .enter().append("svg:g")
          .attr("class", "dimension")
          .attr("transform", function (d) {
            return "translate(" + xscale(d) + ")";
          })
          .call(d3.drag()
              .on("start", function (d) {
                dragging[d] = this.__origin__ = xscale(d);
                this.__dragged__ = false;
                d3.select("#foreground").style("opacity", "0.35");
              })
              .on("drag", function (d) {
                dragging[d] = Math.min(w, Math.max(0, this.__origin__ += d3.event.dx));
                dimensions.sort(function (a, b) {
                  return position(a) - position(b);
                });
                xscale.domain(dimensions);
                g.attr("transform", function (d) {
                  return "translate(" + position(d) + ")";
                });
                brush_count++;
                this.__dragged__ = true;

                // Feedback for axis deletion if dropped
                if (dragging[d] < 12 || dragging[d] > w - 12) {
                  d3.select(this).select(".brush").style("fill", "#b00");
                } else {
                  d3.select(this).select(".brush").style("fill", null);
                }
              })
              .on("end", function (d) {
                if (!this.__dragged__) {
                  // no movement, invert axis
                  var extent = invert_axis(d);

                } else {
                  // reorder axes
                  d3.select(this).transition().attr("transform", "translate(" + xscale(d) + ")");

                  var extent = d3.brushSelection(yscale[d].brush)!=null ?
                      d3.brushSelection(yscale[d].brush).map((point) => {return yscale[d].invert(point)}).sort(num_sort)
                      :null;

                }


                // remove axis if dragged all the way left
                if (dragging[d] < 12 || dragging[d] > w - 12) {
                  remove_axis(d, g);
                }

                // TODO required to avoid a bug
                xscale.domain(dimensions);
                update_ticks(d, extent);


                g.select(".axis")
                    .select(".label")
                    .attr("y", (d, i) => {
                        return dimensions.indexOf(d) % 2 == 0 ? -14 : -30
                    });

                // rerender
                d3.select("#foreground").style("opacity", null);
                brush();
                delete this.__dragged__;
                delete this.__origin__;
                delete dragging[d];

                _self.props.changeaxiscallback(dimensions);
              }))

      // Add an axis and title.
      g.append("svg:g")
          .attr("class", "axis")
          .attr("transform", "translate(0,0)")
          .each(function (d) {
            d3.select(this).call(axis.scale(yscale[d]));
          })
          .append("svg:text")
          .attr("text-anchor", "middle")
          .attr("y", function (d, i) {
            return i % 2 == 0 ? -14 : -30
          })
          .attr("x", 0)
          .attr("class", "label")
          .text(String)
          .append("title")
          .text((d, i) => {return dimensions[i]});

      // Add and store a brush for each axis.
      g.append("svg:g")
          .attr("class", "brush")
          .each(function (d, i) {
            d3.select(this).call(d3.brushY().extent([[-15, 0], [13, h]]).on("brush", brush).on("end", brushend));
            yscale[d].brush = d3.select(this).node();
            d3.select(this).selectAll("rect")
                  .style("visibility", null)
                  .attr("x", -15)
                  .attr("width", 28)
                  .append("title")
                  .text(d);
          })

      g.selectAll(".extent")
          .append("title")
          .text("Drag or resize this filter");



      // Render full foreground
      brush();

    });


    // copy one canvas to another, grayscale
    function gray_copy(source, target) {
      var pixels = source.getImageData(0, 0, w, h);
      target.putImageData(grayscale(pixels), 0, 0);
    }

    // http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
    function grayscale(pixels, args) {
      var d = pixels.data;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i];
        var g = d[i + 1];
        var b = d[i + 2];
        // CIE luminance for the RGB
        // The human eye is bad at seeing red and blue, so we de-emphasize them.
        var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        d[i] = d[i + 1] = d[i + 2] = v
      }
      return pixels;
    };

    // render polylines i to i+render_speed
    function render_range(selection, i, max, opacity) {
      selection.slice(i, max).forEach(function (d) {
        path(d, foreground, color(d.group, opacity));
      });
    };

    // Adjusts rendering speed
    function optimize(timer) {
      var delta = (new Date()).getTime() - timer;
      render_speed = Math.max(Math.ceil(render_speed * 30 / delta), 8);
      render_speed = Math.min(render_speed, 300);
      return (new Date()).getTime();
    }

    // Feedback on rendering progress
    function render_stats(i, n, render_speed) {
      d3.select("#rendered-count").text(i);
      d3.select("#rendered-bar")
          .style("width", (100 * i / n) + "%");
      d3.select("#render-speed").text(render_speed);
    }

    // Feedback on selection
    function selection_stats(opacity, n, total) {
      d3.select("#data-count").text(total);
      d3.select("#selected-count").text(n);
      d3.select("#selected-bar").style("width", (100 * n / total) + "%");
      d3.select("#opacity").text(("" + (opacity * 100)).slice(0, 4) + "%");
    }

    function invert_axis(d) {
      // save extent before inverting
      if (d3.brushSelection(yscale[d].brush)!=null) {
          var extent = d3.brushSelection(yscale[d].brush).map((point) => {return yscale[d].invert(point)}).sort(num_sort);
      }
      if (yscale[d].inverted == true) {
        yscale[d].range([h, 0]);
        d3.selectAll('.label')
            .filter(function (p) {
              return p == d;
            })
            .style("text-decoration", null);
        yscale[d].inverted = false;
      } else {
        yscale[d].range([0, h]);
        d3.selectAll('.label')
            .filter(function (p) {
              return p == d;
            })
            .style("text-decoration", "underline");
        yscale[d].inverted = true;
      }
      return extent;
    }

    function path(d, ctx, color) {
      if (color) ctx.strokeStyle = color;
      ctx.beginPath();
      var x0 = 0, // xscale(0) - 15,
          y0 = yscale[dimensions[0]](d[dimensions[0]]);   // left edge
      ctx.moveTo(x0, y0);
      dimensions.map(function (p, i) {
        var x = xscale(p),
            y = yscale[p](d[p]);
        var cp1x = x - 0.88 * (x - x0);
        var cp1y = y0;
        var cp2x = x - 0.12 * (x - x0);
        var cp2y = y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        x0 = x;
        y0 = y;
      });
      ctx.lineTo(x0 + 15, y0);                               // right edge
      ctx.stroke();
    };

    function color(d, a) {
      // とりあえず全部空色
      var c = [185, 56, 73];//colors[d];
      return ["hsla(", c[0], ",", c[1], "%,", c[2], "%,", a, ")"].join("");
    }

    function position(d) {
      var v = dragging[d];
      return v == null ? xscale(d) : v;
    }

    // Handles a brush event, toggling the display of foreground lines.
    // TODO refactor
    function brush() {
      brush_count++;
      var actives = dimensions.filter(function (p) {
            return d3.brushSelection(yscale[p].brush)!=null;
          }),
          extents = actives.map(function (p) {
            return d3.brushSelection(yscale[p].brush).map((point) => {return yscale[p].invert(point)}).sort(num_sort)
          });

      // hack to hide ticks beyond extent
      var b = d3.selectAll('.dimension')._groups[0]
          .forEach(function (element, i) {
            var dimension = d3.select(element).data()[0];
            if (_.include(actives, dimension)) {
              var extent = extents[actives.indexOf(dimension)];
              d3.select(element)
                  .selectAll('text')
                  .style('font-weight', 'bold')
                  .style('font-size', '13px')
                  .style('display', function () {
                    var value = d3.select(this).data();
                    return extent[0] <= value && value <= extent[1] ? null : "none"
                  });
            } else {
              d3.select(element)
                  .selectAll('text')
                  .style('font-size', null)
                  .style('font-weight', null)
                  .style('display', null);
            }
            d3.select(element)
                .selectAll('.label')
                .style('display', null);
          });
      ;

      // bold dimensions with label
      d3.selectAll('.label')
          .style("font-weight", function (dimension) {
            if (_.include(actives, dimension)) return "bold";
            return null;
          });

      // Get lines within extents
      var selected = [];
      data
          .filter(function (d) {
            return !_.contains(excluded_groups, d.group);
          })
          .map(function (d) {
            return actives.every(function (p, dimension) {
              return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
            }) ? selected.push(d) : null;
          });

      // Render selected lines
      paths(selected, foreground, brush_count, true);

      return selected;
    }

    function brushend() {
      var selected = brush();
      _self.props.selectedcallback(selected);
    }

    // render a set of polylines on a canvas
    function paths(selected, ctx, count) {
      var n = selected.length,
          i = 0,
          opacity = d3.min([2 / Math.pow(n, 0.3), 1]),
          timer = (new Date()).getTime();

      selection_stats(opacity, n, data.length);

      let shuffled_data = _.shuffle(selected);

      ctx.clearRect(0, 0, w + 1, h + 1);

      // render all lines until finished or a new brush event
      function animloop() {
        if (i >= n || count < brush_count) return true;
        var max = d3.min([i + render_speed, n]);
        render_range(shuffled_data, i, max, opacity);
        render_stats(max, n, render_speed);
        i = max;
        timer = optimize(timer);  // adjusts render_speed
      };

      d3.timer(animloop);
    }

    // transition ticks for reordering, rescaling and inverting
    function update_ticks(d, extent) {
      // update brushes
      if (d) {
        var brush_el = d3.selectAll(".brush")
            .filter(function (key) {
              return key == d;
            });
        // single tick
        if (extent) {
          // restore previous extent
          brush_el.call(() => {
               let node = brush_el._groups[0][0],
                   y0 =  extent.map(point => {return yscale[d](point)}).sort(num_sort),
                   tmp_brush;
               d3.select(node).call(tmp_brush = d3.brushY().extent([[-15, 0], [13, h]]).on("brush", brush).on("end", brushend));
               yscale[d].brush = d3.select(node).node();
               d3.select(node).call(tmp_brush.move, [y0[0], y0[1]]);
          });
        } else {
          brush_el.call(() => {
              let node = brush_el._groups[0][0]
               d3.select(node).call(d3.brushY().extent([[-15, 0], [13, h]]).on("brush", brush).on("end", brushend));
               yscale[d].brush = d3.select(node).node();
          });
        }
      } else {
        // all ticks
        d3.selectAll(".brush")
            .each(function (d) {
              d3.select(this).call(d3.brushY().extent([[-15, 0], [13, h]]).on("brush", brush).on("end", brushend));
              yscale[d].brush = d3.select(this).node();
            })
      }

      brush_count++;

      show_ticks();

      // update axes
      d3.selectAll(".axis")
          .each(function (d, i) {
            // hide lines for better performance
            d3.select(this).selectAll('line').style("display", "none");

            // transition axis numbers
            d3.select(this)
                .transition()
                .duration(720)
                .call(axis.scale(yscale[d]));

            // bring lines back
            d3.select(this).selectAll('line').transition().delay(800).style("display", null);

            d3.select(this)
                .selectAll('text')
                .style('font-weight', null)
                .style('font-size', null)
                .style('display', null);
          });
    }

    // Rescale to new dataset domain
    function rescale() {
      // reset yscales, preserving inverted state
      dimensions.forEach(function (d, i) {
        if (yscale[d].inverted) {
          yscale[d] = d3.scaleLinear()
              .domain(d3.extent(data, function (p) {
                return +p[d];
              }))
              .range([0, h]);
          yscale[d].inverted = true;
        } else {
          yscale[d] = d3.scaleLinear()
              .domain(d3.extent(data, function (p) {
                return +p[d];
              }))
              .range([h, 0]);
        }
      });

      update_ticks();

      // Render selected data
      paths(data, foreground, brush_count);
    }


    // Get polylines within extents
    function actives() {
      var actives = dimensions.filter(function (p) {
            return d3.brushSelection(yscale[p].brush)!=null;
          }),
          extents = actives.map(function (p) {
            return d3.brushSelection(yscale[p].brush).map((point) => {return yscale[p].invert(point)}).sort(num_sort)
          });


      // filter extents and excluded groups
      var selected = [];
      data
          .filter(function (d) {
            return !_.contains(excluded_groups, d.group);
          })
          .map(function (d) {
            return actives.every(function (p, i) {
              return extents[i][0] <= d[p] && d[p] <= extents[i][1];
            }) ? selected.push(d) : null;
          });

      // free text search
      var query = d3.select("#search")[0][0].value;
      if (query > 0) {
        selected = search(selected, query);
      }

      return selected;
    }


    // Export data
    function export_csv() {
      var keys = d3.keys(data[0]);
      var rows = actives().map(function (row) {
        return keys.map(function (k) {
          return row[k];
        })
      });
      var csv = d3.csv.format([keys].concat(rows)).replace(/\n/g, "<br/>\n");
      var styles = "<style>body { font-family: sans-serif; font-size: 12px; }</style>";
      window.open("text/csv").document.write(styles + csv);
    }


    // scale to window size
     window.addEventListener('resize',() => {
      width = document.body.clientWidth;
      height = d3.max([document.body.clientHeight - 500, 220]);

      w = width - m[1] - m[3];
      h = height - m[0] - m[2];

      d3.select("#chart")
          .style("height", (h + m[0] + m[2]) + "px")

      d3.selectAll("canvas")
          .attr("width", w)
          .attr("height", h)
          .style("padding", m.join("px ") + "px");

      d3.select(this.node)
          .attr("width", w + m[1] + m[3])
          .attr("height", h + m[0] + m[2])
          .select("g")
          .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

      xscale = d3.scalePoint().range([15, w-15]).domain(dimensions);
      dimensions.forEach(function (d) {
        yscale[d].range([h, 0]);
      });

      d3.selectAll(".dimension")
          .attr("transform", function (d) {
            return "translate(" + xscale(d) + ")";
          })
      // update brush placement
      d3.selectAll(".brush")
          .each(function (d) {
            d3.select(this).call(d3.brushY().extent([[-15, 0], [13, h]]).on("brush", brush).on("end", brushend));
            yscale[d].brush = d3.select(this).node();
          })
      brush_count++;

      // update axis placement
      axis = axis.ticks(1 + height / 50);
          d3.selectAll(".axis")
              .each(function (d) {
                d3.select(this).call(axis.scale(yscale[d]));
              });

      // render data
      brush();
    });

    // Remove all but selected from the dataset
    function keep_data() {
      let new_data = actives();
      if (new_data.length == 0) {
        alert("I don't mean to be rude, but I can't let you remove all the data.\n\nTry removing some brushes to get your data back. Then click 'Keep' when you've selected data you want to look closer at.");
        return false;
      }
      data = new_data;
      rescale();
    }

    // Exclude selected from the dataset
    function exclude_data() {
      let new_data = _.difference(data, actives());
      if (new_data.length == 0) {
        alert("I don't mean to be rude, but I can't let you remove all the data.\n\nTry selecting just a few data points then clicking 'Exclude'.");
        return false;
      }
      data = new_data;
      rescale();
    }

    function remove_axis(d, g) {
      dimensions = _.difference(dimensions, [d]);
      xscale.domain(dimensions);
      g.attr("transform", function (p) {
        return "translate(" + position(p) + ")";
      });
      g.filter(function (p) {
        return p == d;
      }).remove();
      update_ticks();
    }

    d3.select("#keep-data").on("click", keep_data);
    d3.select("#exclude-data").on("click", exclude_data);
    d3.select("#export-data").on("click", export_csv);
    d3.select("#search").on("keyup", brush);


    // Appearance toggles
    d3.select("#hide-ticks").on("click", hide_ticks);
    d3.select("#show-ticks").on("click", show_ticks);
    d3.select("#dark-theme").on("click", dark_theme);
    d3.select("#light-theme").on("click", light_theme);

    function hide_ticks() {
      d3.selectAll(".axis g").style("display", "none");
      //d3.selectAll(".axis path").style("display", "none");
      d3.selectAll(".background").style("visibility", "hidden");
      d3.selectAll("#hide-ticks").attr("disabled", "disabled");
      d3.selectAll("#show-ticks").attr("disabled", null);
    };

    function show_ticks() {
      d3.selectAll(".axis g").style("display", null);
      //d3.selectAll(".axis path").style("display", null);
      d3.selectAll(".background").style("visibility", null);
      d3.selectAll("#show-ticks").attr("disabled", "disabled");
      d3.selectAll("#hide-ticks").attr("disabled", null);
    };

    function dark_theme() {
      d3.select("body").attr("class", "dark");
      d3.selectAll("#dark-theme").attr("disabled", "disabled");
      d3.selectAll("#light-theme").attr("disabled", null);
    }

    function light_theme() {
      d3.select("body").attr("class", null);
      d3.selectAll("#light-theme").attr("disabled", "disabled");
      d3.selectAll("#dark-theme").attr("disabled", null);
    }

    function search(selection, str) {
      let pattern = new RegExp(str, "i")
      return _(selection).filter(function (d) {
        return pattern.exec(d.name);
      });
    }
  }
  render() {
    return (<div id="chart">
    <canvas id="background"></canvas>
    <canvas id="foreground"></canvas>
    <canvas id="highlight"></canvas>
    <svg ref={node => this.node = node}>
    </svg>
  </div>)
  }
}

export default ParallelCoodinatePlot
