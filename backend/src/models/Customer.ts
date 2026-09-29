export interface Customer {
  id: string;
  name: string;
  email: string;
  signupDate: string;
  vip: boolean;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  signup_date: string;
  vip: number;
}

export function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    signupDate: row.signup_date,
    vip: Boolean(row.vip),
  };
}
