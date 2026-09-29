import MobilePaymentInvitation from "./Mobile/MobilePaymentInvitation.jsx";

export default function DesktopPaymentInvitationModal(props) {
  return <MobilePaymentInvitation {...props} isModal={true} />;
}
