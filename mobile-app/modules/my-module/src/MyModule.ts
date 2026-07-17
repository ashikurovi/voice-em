import { NativeModule, requireNativeModule } from 'expo';

declare class MyModule extends NativeModule<{}> {
  makePhoneCall(phoneNumber: string): boolean;
}

export default requireNativeModule<MyModule>('MyModule');
