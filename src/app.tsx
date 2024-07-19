import { Component } from "preact"
import "./app.css"

interface IHarFileRecord {
  Url: string,
  State: number,
  Response: string
}

export class App extends Component<{}, { harData: IHarFileRecord[] }> {

  constructor() {
    super();

    this.state = {
      harData: [
        { Url: "https://zonk.pl", State: 200, Response: "{ test: 1 }" },
        { Url: "https://kuku.pl", State: 200, Response: "{ test: 2 }" },
        { Url: "https://contoso.pl", State: 400, Response: "{ test: 3 }" },
        { Url: "https://fabrokam.pl", State: 200, Response: "{ test: 4 }" },
      ]
    }
  }

  bumpSomething() {
    this.setState(s => {
      s.harData[0].State++;

      return s;
    })

    console.log("state updated: " +  this.state.harData[0].State)
  }

  render() {

    const headers = Object.keys(this.state.harData[0]);

    return <>
      <div className="overflow-x-auto">
        <table className="table table-xs">
          <thead>
            <tr>
              { headers.map(h => (<th>{h}</th>)) }
            </tr>
          </thead>
          <tbody>
            {this.state.harData.map(r => (<tr>
              {headers.map(h => (<td>{
                (r as any)[h]
                }</td>))}
            </tr>))}
          </tbody>
        </table>
      </div>
      <div><button onClick={ () => this.bumpSomething() }>test</button></div>
    </>
  }
}
