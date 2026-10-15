package rw.magomano.sacco;

import android.os.Bundle;
import android.webkit.CookieManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(getColor(rw.magomano.sacco.R.color.statusBarBackground));
        getWindow().setNavigationBarColor(getColor(rw.magomano.sacco.R.color.navigationBarBackground));
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(false);
        insetsController.setAppearanceLightNavigationBars(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(getBridge().getWebView(), true);
    }
}
