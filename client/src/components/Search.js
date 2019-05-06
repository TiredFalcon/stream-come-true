import React from "react";
class Search extends React.PureComponent {
    constructor(props){
      super(props)
      this.state = {    
          input: "" 
      }
    }
    render() {
      return(
            <div className="input-group">
          <input id="btn-input" type="text" className="form-control input-md" placeholder="Keyword" onChange={this.props.handler}>
          </input>
          <span className="input-group-btn">
            <button className="btn btn-primary btn-md" id="btn-todo">
              Search
            </button>
          </span>
        </div>
      );
    }
  }
  export default Search;