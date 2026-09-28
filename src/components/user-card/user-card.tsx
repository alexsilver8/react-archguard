import type { IUserCardProps } from './user-card.types';

export function UserCard({ name }: IUserCardProps): JSX.Element {
    return <div>{name}</div>;
}
