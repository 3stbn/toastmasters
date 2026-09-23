import { Route, Switch } from "wouter";
import { Toaster } from "sonner";
import { Home } from "./pages/Home";
import { Mic } from "./pages/Mic";
import { Session } from "./pages/Session";
import { Screen } from "./pages/Screen";
import { Credits } from "./pages/Credits";

export function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/creditos" component={Credits} />
        <Route path="/s/:code/screen" component={Screen} />
        <Route path="/s/:code/mic" component={Mic} />
        <Route path="/s/:code/control" component={Session} />
        <Route path="/s/:code" component={Screen} />
        <Route>
          <Home />
        </Route>
      </Switch>
      <Toaster theme="dark" position="top-center" richColors />
    </>
  );
}
