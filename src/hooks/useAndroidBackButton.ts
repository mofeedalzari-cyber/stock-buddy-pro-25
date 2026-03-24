import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async () => {
      try {
        const { App } = await import("@capacitor/app");
        App.addListener("backButton", () => {
          // If not on the main page, go back
          if (location.pathname !== "/") {
            navigate("/");
          } else {
            App.exitApp();
          }
        });

        return () => {
          App.removeAllListeners();
        };
      } catch {
        // Not running in Capacitor environment, ignore
      }
    };

    handleBackButton();
  }, [navigate, location.pathname]);
};
