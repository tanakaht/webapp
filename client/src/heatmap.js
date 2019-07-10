import React, { Component } from 'react'
import * as d3 from 'd3';
import * as _ from 'underscore';
import ParallelCoodinatePlot from './parallel'
import './heatmap.css';


var rowpixcel = 2

class HeatMap extends Component {
  constructor(props) {
    // props.callback: 洗濯中のデータのリストを引数に、このviewのアップデートのたび走る
    // props.csvpath: csv の置き場()
    super(props)
    this.createHeatMap = this.createHeatMap.bind(this);
    this.changeaxiscallback = this.changeaxiscallback.bind(this);
    this.selectedcallback_filter = this.selectedcallback_filter.bind(this);
    this.selectedcallback_highlight = this.selectedcallback_highlight.bind(this);
    //this.resize = this.resize().bind(this);
    this.selectedcallback = this.selectedcallback_highlight;
  }

  componentDidMount() {
    this.createHeatMap()
  }

  componentDidUpdate() {
    this.createHeatMap()
  }

  createHeatMap() {
      var _self = this;
      var start_color = '#ffffff';
      var end_color = '#e67e22';


      d3.csv(_self.props.csvpath).then(function (raw_data) {
      // Convert quantitative scales to floats
       var data = raw_data.map(function (d) {
           for (var k in d) {
               if (!_.isNaN(raw_data[0][k] - 0)) {
                   d[k] = parseFloat(d[k]) || 0;
               }
           }
           return d;
       });
      _self.dimensions = d3.keys(data[0]).filter(function (k) {
        return (_.isNumber(data[0][k]))
      })

      _self.width = document.body.clientWidth;
      _self.height = data.length * rowpixcel;


      // SVG領域の設定
      var svg = d3.select( _self.node ).attr("width", _self.width).attr("height", _self.height).attr("transform", "translate(" + 0 + "," + (d3.max([document.body.clientHeight - 540, 240])+100)  + ")");;
      var g = svg.append("g").attr("transform", "translate(" + 0 + "," + 0 + ")");

      // 3. スケールの設定
      _self.xscale = d3.scalePoint().range([0, _self.width-30]).domain(_self.dimensions);
      _self.yscale = d3.scaleBand().range([0, _self.height]).domain(d3.range(data.length));
      console.log(_self.xscale.step())

      var colors = {};
      _self.dimensions.forEach( p => {
          colors[p] = d3.scaleSequential(
              function (t) {
                  return d3.interpolate( start_color, end_color )(t);
              }
          ).domain([ d3.min(data,function(d) {return d[p];}),d3.max(data,function(d) {return d[p];})]);
      })

      // 4. ヒートマップの作成
       g.selectAll(".row")
           .data(data)
           .enter()
           .append("g")
           .attr("class", "row")
           .attr("transform", function(d, i) { return "translate(0," + _self.yscale(i) + ")"; })
           .selectAll(".cell")
           .data(function(d) { return _self.dimensions.map(p => {return [p, d[p]]}) })
           .enter()
           .append("rect")
           .attr("class", "cell")
           .attr("x", function(d, i) { return _self.xscale(d[0]); })
           .style("stroke","#000000")
           .style("stroke-dasharray", "2 999999") //左にのみ線
           .attr("width", _self.xscale.step())
           .attr("height", _self.yscale.bandwidth())
           .attr("opacity", 0.9)
           .attr("fill", function(d) { return colors[d[0]](d[1]); });
            // resize

      window.addEventListener('resize', _self.resize.bind(_self));
      });

  }

  changeaxiscallback(dimensions) {
      // 新しくxscale、dimension.foreach=>rows.foreach[i]translate
      var _self = this;
      var rows = d3.select( _self.node ).select("g").selectAll(".row")
      var xscale_new = d3.scalePoint().range([0, _self.width-30]).domain(dimensions);

      dimensions.filter((p) => {return xscale_new(p) != _self.xscale(p)})
          .forEach((p) => {
              rows.selectAll(".cell")
                  .filter((d) => {return d[0]==p})
                  .transition().duration(1000)
                  .attr("x", function(d, i) { return xscale_new(d[0]); })
      });
      _self.dimensions = dimensions
      _self.xscale = xscale_new;

  }

  selectedcallback_filter(selected) {
      var _self = this;
      var rows = d3.select( _self.node ).select("g").selectAll(".row");
      var ids = selected.map(d => { return d["id"]});
      _self.height = selected.length * rowpixcel
      _self.yscale = d3.scaleBand().rangeRound([0, _self.height]).domain(d3.range(selected.length));

      // 非選択itemの行を削除
      rows.filter((d)=> {
          return !_.contains(ids, d["id"])
      }).style("visibility", 'hidden');
      // 選択itemの行を詰める
      rows.filter((d)=> {
          return _.contains(ids, d["id"])
      }).style("visibility", 'visible')
        .transition().duration(1000)
        .attr("transform", function(d, i) {return "translate(0," + (_self.yscale(i)) + ")"; })
  }

  selectedcallback_highlight(selected) {
      var _self = this;
      var rows = d3.select( _self.node ).select("g").selectAll(".row");
      var ids = selected.map(d => { return d["id"]});
      _self.height = selected.length * rowpixcel;
      _self.yscale = d3.scaleBand().rangeRound([0, _self.height]).domain(d3.range(selected.length));

      // 非選択itemの行を非highlight
      rows.filter((d)=> {
          return !_.contains(ids, d["id"])
      }).transition().duration(1000)
        .attr("fill-opacity", 0.1);
      // 選択itemの行をhighlight
      rows.filter((d)=> {
          return _.contains(ids, d["id"])
      }).transition().duration(1000)
        .attr("fill-opacity", 1);
  }

  resize() {
      var _self = this;
      _self.width = document.body.clientWidth;
      // _self.height = fixed;

      // SVG領域の設定
      var svg = d3.select( _self.node ).attr("width", _self.width).attr("height", _self.height).attr("transform", "translate(" + 0 + "," + (d3.max([document.body.clientHeight - 540, 240])+100)  + ")");;
      var g = svg.select("g");

      _self.xscale = d3.scalePoint().range([0, _self.width-30]).domain(_self.dimensions);
      // _self.yscale = fixed

       g.selectAll(".row")
           .selectAll(".cell")
           .attr("width", _self.xscale.step())
           .attr("x", function(d, i) { return _self.xscale(d[0]); });
  }



  render() {
    return (
        <div>
        <ParallelCoodinatePlot  selectedcallback={this.selectedcallback} changeaxiscallback={this.changeaxiscallback} csvpath={this.props.csvpath} />
        <svg ref={node => this.node = node}>
        </svg>
        </div>)
  }
}

export default HeatMap
