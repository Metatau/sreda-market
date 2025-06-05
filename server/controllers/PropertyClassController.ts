import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { storage } from "../storage";
import { handleAsyncError, NotFoundError } from "../utils/errors";
import { validateId } from "../utils/validation";

export class PropertyClassController extends BaseController {
  getPropertyClasses = handleAsyncError(async (req: Request, res: Response) => {
    const propertyClasses = await storage.getPropertyClasses();
    this.sendSuccess(res, propertyClasses);
  });

  getPropertyClass = handleAsyncError(async (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    const propertyClass = await storage.getPropertyClass(id);
    
    if (!propertyClass) {
      throw new NotFoundError("Property class");
    }

    this.sendSuccess(res, propertyClass);
  });
}