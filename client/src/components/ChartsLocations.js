import React from "react"
import OverTime from "./LineChart"
import MostWords from "./BarChart"
import config from "../config"

const red_over_time = config['red_over_time'];
const twit_over_time = config['twit_over_time'];
const red_pop_key_words = config['red_pop_key_words'];
const twit_pop_key_words = config['twit_pop_key_words'];

class ChartsLocation extends React.Component{
    render(){
      return(
         <div>
            <div className="row">
              <div className="col-lg-12">
                <h1 className="page-header col-lg-12">Charts</h1>
              </div>
            </div>
            <div className="col-lg-12">
            <OverTime name={"Twiter Data"} data={twit_over_time}/>
            <OverTime name={"Reddit Data"} data={red_over_time}/>
            </div>
            <div className="col-lg-12">
              <MostWords name={"Twitter Popular Keywords"} data={twit_pop_key_words}/>
              <MostWords name={"Reddit Popular Keywords"} data={red_pop_key_words}/>
            </div>
         </div>
      );
    }
  }
  export default ChartsLocation;