import React from "react";
import { Button } from "@/components/ui/button";
import { useSupport } from "./SupportProvider";

type State = { error?: Error };

export class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = {};
  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return <Fallback error={this.state.error} />;
  }
}

function Fallback({ error }: { error: Error }) {
  const support = useSupport();
  return (
    <div className="p-6 m-6 rounded-2xl border bg-background max-w-xl mx-auto text-center">
      <h2 className="text-lg font-semibold mb-2">Ocurrió un error inesperado</h2>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>Recargar</Button>
        <Button className="bg-emerald-600 text-white" onClick={() => support.open({
          title: "Error inesperado (ErrorBoundary)",
          message: error?.stack?.slice(0, 500),
          errorCode: "UI_BOUNDARY"
        })}>Contactar soporte</Button>
      </div>
    </div>
  );
}