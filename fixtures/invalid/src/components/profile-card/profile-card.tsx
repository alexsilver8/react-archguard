interface IProfileCardProps {
    name: string;
}

function formatName(name: string): string {
    return name.trim();
}

export function Profile({ name }: IProfileCardProps): JSX.Element {
    return <div>{formatName(name)}</div>;
}
