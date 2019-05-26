import React from "react";
import ReactEcharts from "echarts-for-react";

const DAY = 24 * 60 * 60 * 1000;

class OverTime extends React.Component {
  render() {
    const {
      onChangeTimeInterval,
      textfilter,
      timefilter,
      bars,
      lines,
      api
    } = this.props;
    return (
      <div className="col-xs-6">
        <div className="panel panel-default">
          <div className="panel-heading">{this.props.name}</div>
          <div className="panel-body">
            <Graph
              api={api}
              textfilter={textfilter}
              timefilter={timefilter}
              onChangeTimeInterval={onChangeTimeInterval}
              refreshing={this.props.refreshing}
              labelX={this.props.labelX}
              labelY={this.props.labelY}
              bars={bars}
              lines={lines}
            />
          </div>
        </div>
      </div>
    );
  }
}
class Graph extends React.Component {
  static defaultProps = {
    bars: [],
    lines: []
  };
  constructor(props) {
    super(props);
    if (props.bars.length + props.lines.length < 1) {
      throw new Error("At least one bar or line needs to be defined");
    }
    this.state = {
      option: this.getDefaultOption(),
      data: []
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    if (this.props.textfilter !== prevProps.textfilter) {
      this.fetchData();
    }
    if (this.props.timefilter !== prevProps.timefilter) {
      this.fetchData();
    }
  }
  //disables removes the selection rectangle
  _resetSelectionState() {
    this.setState(() => ({
      refAreaLeft: "",
      refAreaRight: ""
    }));
  }
  //calls this.props.onChangeTimeInterval
  changeTimeInterval() {
    let { onChangeTimeInterval } = this.props;
    let { refAreaLeft, refAreaRight } = this.state;
    //if the from and to time are the same or there is no onChangeTimeInterval callback
    //we return immediately
    if (
      refAreaLeft === refAreaRight ||
      refAreaRight === "" ||
      !onChangeTimeInterval
    ) {
      this._resetSelectionState();
      return;
    }
    const fromDate = new Date(Math.min(refAreaLeft, refAreaRight));
    const toDate = new Date(Math.max(refAreaLeft, refAreaRight));
    //call calback
    onChangeTimeInterval(fromDate, toDate);
    this._resetSelectionState();
  }

  fetchData() {
    fetch(
      this.props.api +
        `?textfilter=${this.props.textfilter || ""}` +
        (this.props.timefilter ? this.props.timefilter : "")
    )
      .then(res => res.json())
      .then(res => {
        this.updateGraph(res);
      });
  }
  formatDate(time) {
    const date = new Date(time);
    return date.toLocaleDateString("it-IT");
  }
  formatTime(time) {
    const date = new Date(time);
    return date.toLocaleTimeString("it-IT");
  }
  formatDateTime(time) {
    const date = new Date(time);
    return date.toLocaleString("it-IT");
  }
  /**
   *
   * @param {[series information]} params
   */
  formatTooltip(params) {
    let { option } = this.state;
    let timeAxis = option.xAxis[0].data;
    let index = params[0].dataIndex;

    let fromString = this.formatDateTime(timeAxis[index].actual);
    let toString = timeAxis[index + 1]
      ? this.formatDateTime(timeAxis[index + 1].actual)
      : "now";
    let ret = `<div>${fromString} - ${toString} </di>`;
    params.forEach(item => {
      ret += `<div>${item.seriesName}: ${item.value}</div>`;
    });
    return ret;
  }
  updateGraph(data) {
    const option = this.getDefaultOption();
    //note data.length is not always 100 it is usually in [99,101]

    //if time between first and last item is more than 24h we display dates instead of times
    if(data.length !== 0){
      let first = data[0].time;
      let last = data[data.length - 1].time;
      option.xAxis[0].data = data.map(item => {
        return {
          value:
            last - first < DAY
              ? this.formatTime(item.time)
              : this.formatDate(item.time),
          actual: item.time
        };
      });
    }else{
      option.xAxis[0].data = []
    }
    
    //updating data for all series
    option.series.forEach(item => {
      item.data = data.map(x=> x[item.dataKey])
    })
    this.setState({
      option: option
    });
  }
  /**
   * returns the echarts options that are not dependent on the fetched data
   */
  getDefaultOption() {
    let { bars, lines } = this.props;
    let series = [];
    lines.forEach(conf =>
      series.push({
        type: "line",
        name: conf.name,
        color: conf.color,
        dataKey: conf.dataKey,
        smooth: true,
        data: []
      })
    );
    bars.forEach(conf =>
      series.push({
        type: "bar",
        stack: conf.stack,
        name: conf.name,
        color: conf.color,
        dataKey: conf.dataKey,
        data: []
      })
    );
    return {
      title: {
        // text:'We could put a title here as well',
      },
      tooltip: {
        trigger: "axis",
        formatter: params => {
          return this.formatTooltip(params);
        }
      },
      //only displaying legend if we display more than one thing
      legend: series.length > 1 ? {orient: "horizontal"} : false,
      dataZoom: {
        show: false,
        start: 0,
        end: 100
      },
      xAxis: [
        {
          type: "category",
          boundaryGap: true,
          data: []
        }
      ],
      yAxis: [
        {
          type: "value",
          scale: true,
          name: "count",
          nameLocation: "middle",
          nameTextStyle: {
            padding: [0, 0, 30, 0]
          },
          min: 0,
          boundaryGap: [0.2, 0.2]
        }
      ],
      series: series
    };
  }

  render() {
    return <ReactEcharts ref="echarts_react" option={this.state.option} />;
  }
}

export default OverTime;
