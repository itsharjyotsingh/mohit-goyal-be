export type EventsFields = {
    isHidden?: boolean
}

export type EventsRequestBody = {
    price: number,
    originalPrice: number,
    title: string,
    description: string[],
    eventDate: Date,
    eventTime: string,
    eventDuration: number,
    isHidden?: boolean,
    imageUrl?: string
}