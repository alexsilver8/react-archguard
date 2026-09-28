import type { IAgentCardProps } from './agent-card.types';

export function AgentCard({ name }: IAgentCardProps): JSX.Element {
    return <div>{name}</div>;
}

export function formatAgentName(name: string): string {
    return name.trim();
}
