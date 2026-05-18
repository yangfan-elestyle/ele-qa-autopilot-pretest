import { redirect } from 'react-router';

export function loader() {
  return redirect('/autopilot');
}

export default function Index() {
  return null;
}
