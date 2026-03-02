import { Route, Switch } from "wouter";
import Landing from "./pages/landing";
import Index from "./pages/index";
import AdminDashboard from "./pages/admin";
import { Provider } from "./components/provider";

function App() {
	return (
		<Provider>
			<Switch>
				<Route path="/" component={Landing} />
				<Route path="/studio" component={Index} />
				<Route path="/admin" component={AdminDashboard} />
			</Switch>
		</Provider>
	);
}

export default App;
