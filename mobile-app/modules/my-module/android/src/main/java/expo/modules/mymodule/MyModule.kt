package expo.modules.mymodule

import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    Function("makePhoneCall") { phoneNumber: String ->
      val intent = Intent(Intent.ACTION_CALL)
      intent.data = Uri.parse("tel:$phoneNumber")
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
      
      val context = appContext.reactContext ?: return@Function false
      try {
        context.startActivity(intent)
        return@Function true
      } catch (e: SecurityException) {
        return@Function false
      } catch (e: Exception) {
        return@Function false
      }
    }
  }
}
